import ReactNativeBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { downloadAuthedPdf, openPdf } from '@/native/pdf';
import { ApiError } from '@/lib/api/errors';
import { refreshSingleFlight, forceLogout } from '@/lib/api/tokens';

jest.mock('@/lib/api/tokens', () => ({
  getAccessToken: jest.fn(() => 'test-access-token'),
  refreshSingleFlight: jest.fn(async () => 'refreshed'),
  forceLogout: jest.fn(),
}));

const mockFetch = (ReactNativeBlobUtil as unknown as { __mockFetch: jest.Mock }).__mockFetch;
const mockConfig = ReactNativeBlobUtil.config as unknown as jest.Mock;

const res = (status: number, path = '/mock/documents/ace/POS-1.pdf') => ({
  info: () => ({ status }),
  path: () => path,
});

afterEach(() => {
  jest.clearAllMocks();
  mockFetch.mockReset();
  (refreshSingleFlight as jest.Mock).mockResolvedValue('refreshed');
});

test('401 then refreshed then 200 resolves a file:// url and shares it', async () => {
  mockFetch.mockResolvedValueOnce(res(401)).mockResolvedValueOnce(res(200));

  const url = await downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' });

  expect(url).toBe('file:///mock/documents/ace/POS-1.pdf');
  expect(refreshSingleFlight).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(mockConfig).toHaveBeenCalledWith(expect.objectContaining({ path: '/mock/documents/ace/POS-1.pdf', overwrite: true }));

  await openPdf(url, 'POS-1');
  expect(Share.open).toHaveBeenCalledWith({ url, type: 'application/pdf', title: 'POS-1', failOnCancel: false });
});

test('a 403 rejects with a forbidden ApiError and does not retry', async () => {
  mockFetch.mockResolvedValueOnce(res(403));

  await expect(downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' })).rejects.toMatchObject({
    code: 'forbidden',
    status: 403,
  });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(refreshSingleFlight).not.toHaveBeenCalled();
});

test('401 with a rejected refresh throws session_expired and forces logout, without retrying the download', async () => {
  mockFetch.mockResolvedValueOnce(res(401));
  (refreshSingleFlight as jest.Mock).mockResolvedValueOnce('rejected');

  let caught: unknown;
  try {
    await downloadAuthedPdf({ path: '/sales-orders/o1/pdf', fileName: 'POS-1.pdf' });
  } catch (e) {
    caught = e;
  }

  expect(caught).toBeInstanceOf(ApiError);
  expect(caught).toMatchObject({ code: 'session_expired', status: 401 });
  expect(mockFetch).toHaveBeenCalledTimes(1); // no retry — refresh did not come back 'refreshed'
  expect(forceLogout).toHaveBeenCalledWith('session_expired');
});
