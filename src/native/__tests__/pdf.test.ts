import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import { http, HttpResponse } from 'msw';
// msw/node, not msw/native — under Jest's `testEnvironment: 'node'` axios uses its
// Node http adapter, which only msw/node sees (same note as client.test.ts).
import { setupServer } from 'msw/node';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { bytesToBase64, downloadAuthedPdf, openPdf, sharePdf } from '@/native/pdf';
import { ApiError } from '@/lib/api/errors';
import { clearTokens, setTokens } from '@/lib/api/tokens';

const mockWriteFile = ReactNativeBlobUtil.fs.writeFile as jest.Mock;
const mockUnlink = ReactNativeBlobUtil.fs.unlink as jest.Mock;
const mockActionViewIntent = ReactNativeBlobUtil.android.actionViewIntent as jest.Mock;

const TARGET = '/mock/documents/ace/POS-1.pdf';
const server = setupServer();

// A body longer than one 8 KB socket read — the exact shape that the old
// `react-native-blob-util` stream-to-disk transport silently truncated.
const pdfBytes = (() => {
  const bytes = new Uint8Array(20_000);
  const header = '%PDF-1.7\n';
  for (let i = 0; i < header.length; i++) bytes[i] = header.charCodeAt(i);
  for (let i = header.length; i < bytes.length; i++) bytes[i] = i % 256;
  return bytes;
})();

const pdfRoute = (status = 200, body: Uint8Array = pdfBytes) =>
  http.get('http://localhost:8000/api/v1/sales-orders/o1/pdf', () =>
    status === 200
      ? new HttpResponse(body, { headers: { 'content-type': 'application/pdf' } })
      : HttpResponse.json({ detail: { code: 'x', message: 'nope' } }, { status }));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

beforeEach(async () => {
  await setTokens({ access_token: 'test-access-token', refresh_token: 'r1' });
});

afterEach(async () => {
  server.resetHandlers();
  await clearTokens();
  jest.clearAllMocks();
  mockWriteFile.mockReset().mockResolvedValue(undefined);
  mockUnlink.mockReset().mockResolvedValue(undefined);
  mockActionViewIntent.mockReset().mockResolvedValue(true);
  Platform.OS = 'ios';
});

test('bytesToBase64 matches Node Buffer base64 across every padding remainder', () => {
  for (const len of [0, 1, 2, 3, 4, 5, 8191, 8192, 8193, 20_000]) {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = (i * 7 + 13) % 256;
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  }
});

test('writes the whole body to disk — every byte, not just the first read', async () => {
  server.use(pdfRoute());

  const url = await downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' });

  expect(url).toBe(`file://${TARGET}`);
  expect(mockWriteFile).toHaveBeenCalledTimes(1);
  const [writtenPath, writtenData, encoding] = mockWriteFile.mock.calls[0]!;
  expect(writtenPath).toBe(TARGET);
  expect(encoding).toBe('base64');
  const written = Buffer.from(writtenData as string, 'base64');
  expect(written.length).toBe(pdfBytes.length);
  expect(written.subarray(0, 9).toString()).toBe('%PDF-1.7\n');
  expect(Uint8Array.from(written)).toEqual(pdfBytes);
});

test('a 401 refreshed by the shared interceptor is retried and then succeeds', async () => {
  let token = 'test-access-token';
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () => {
      token = 'new';
      return HttpResponse.json({ access_token: 'new', refresh_token: 'r2', token_type: 'bearer' });
    }),
    http.get('http://localhost:8000/api/v1/sales-orders/o1/pdf', ({ request }) =>
      request.headers.get('authorization') === 'Bearer new' && token === 'new'
        ? new HttpResponse(pdfBytes, { headers: { 'content-type': 'application/pdf' } })
        : HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
  );

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).resolves.toBe(`file://${TARGET}`);
  expect(mockWriteFile).toHaveBeenCalledTimes(1);
});

test('a 401 the refresh cannot recover surfaces as session_expired and writes nothing', async () => {
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () => HttpResponse.json({ detail: 'nope' }, { status: 401 })),
    pdfRoute(401),
  );

  let caught: unknown;
  try {
    await downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' });
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeInstanceOf(ApiError);
  expect(caught).toMatchObject({ code: 'session_expired', status: 401 });
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('a 403 rejects with a forbidden ApiError and writes nothing', async () => {
  server.use(pdfRoute(403));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'forbidden',
    status: 403,
  });
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('a 500 rejects with pdf_failed', async () => {
  server.use(pdfRoute(500));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'pdf_failed',
    status: 500,
  });
});

test('a failed write cleans up the partial file and still reports pdf_failed', async () => {
  server.use(pdfRoute());
  mockWriteFile.mockRejectedValueOnce(new Error('ENOSPC'));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'pdf_failed',
  });
  expect(mockUnlink).toHaveBeenCalledWith(TARGET);
});

test('a failed cleanup of the partial file does not mask the write error', async () => {
  server.use(pdfRoute());
  mockWriteFile.mockRejectedValueOnce(new Error('ENOSPC'));
  mockUnlink.mockRejectedValueOnce(new Error('ENOENT: nothing was written'));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'pdf_failed',
  });
});

test('an empty body is treated as a failed download, not a valid PDF', async () => {
  server.use(pdfRoute(200, new Uint8Array(0)));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'pdf_failed',
  });
  expect(mockWriteFile).not.toHaveBeenCalled();
});

test('on Android, openPdf opens the file via the default viewer intent and never calls Share.open', async () => {
  Platform.OS = 'android';

  await openPdf(`file://${TARGET}`, 'POS-1');

  expect(mockActionViewIntent).toHaveBeenCalledWith(TARGET, 'application/pdf');
  expect(Share.open).not.toHaveBeenCalled();
});

test('on Android, openPdf falls back to the share sheet when no app can view the intent (ENOAPP)', async () => {
  Platform.OS = 'android';
  mockActionViewIntent.mockRejectedValueOnce(Object.assign(new Error('No app installed'), { code: 'ENOAPP' }));

  const url = `file://${TARGET}`;
  await openPdf(url, 'POS-1');

  expect(mockActionViewIntent).toHaveBeenCalledTimes(1);
  expect(Share.open).toHaveBeenCalledWith({ url, type: 'application/pdf', title: 'POS-1', failOnCancel: false });
});

test('on iOS, openPdf goes straight to the share sheet', async () => {
  const url = `file://${TARGET}`;
  await openPdf(url, 'POS-1');

  expect(mockActionViewIntent).not.toHaveBeenCalled();
  expect(Share.open).toHaveBeenCalledWith({ url, type: 'application/pdf', title: 'POS-1', failOnCancel: false });
});

test('sharePdf always goes through Share.open, regardless of platform', async () => {
  Platform.OS = 'android';

  const url = `file://${TARGET}`;
  await sharePdf(url, 'POS-1');

  expect(mockActionViewIntent).not.toHaveBeenCalled();
  expect(Share.open).toHaveBeenCalledWith({ url, type: 'application/pdf', title: 'POS-1', failOnCancel: false });
});
