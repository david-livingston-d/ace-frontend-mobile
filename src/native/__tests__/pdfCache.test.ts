import ReactNativeBlobUtil from 'react-native-blob-util';
import { sweepPdfCache } from '../pdfCache';

const DAY_MS = 24 * 60 * 60 * 1000;

const ls = ReactNativeBlobUtil.fs.ls as jest.Mock;
const stat = ReactNativeBlobUtil.fs.stat as jest.Mock;
const unlink = ReactNativeBlobUtil.fs.unlink as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  unlink.mockResolvedValue(undefined);
});

function statFor(files: Record<string, { size: number; lastModified: number }>) {
  stat.mockImplementation(async (path: string) => {
    const name = path.split('/').pop()!;
    const meta = files[name];
    if (!meta) throw new Error(`no fixture for ${name}`);
    return { type: 'file' as const, path, filename: name, size: meta.size, lastModified: meta.lastModified };
  });
}

test('deletes files older than maxAgeDays and keeps the rest', async () => {
  const now = Date.now();
  ls.mockResolvedValue(['old.pdf', 'new.pdf']);
  statFor({
    'old.pdf': { size: 100, lastModified: now - 10 * DAY_MS },
    'new.pdf': { size: 100, lastModified: now - 1 * DAY_MS },
  });

  await sweepPdfCache({ maxAgeDays: 7, maxBytes: 50 * 1024 * 1024 });

  expect(unlink).toHaveBeenCalledTimes(1);
  expect(unlink).toHaveBeenCalledWith(expect.stringContaining('old.pdf'));
});

test('trims survivors to maxBytes, oldest-first, once age alone is not enough', async () => {
  const now = Date.now();
  ls.mockResolvedValue(['a.pdf', 'b.pdf', 'c.pdf']);
  statFor({
    'a.pdf': { size: 20, lastModified: now - 3 * DAY_MS }, // oldest
    'b.pdf': { size: 20, lastModified: now - 2 * DAY_MS },
    'c.pdf': { size: 20, lastModified: now - 1 * DAY_MS }, // newest
  });

  // All three are well within maxAgeDays (365), so only the size cap applies:
  // total 60 > 40, so the oldest (a.pdf) goes to bring it back to 40.
  await sweepPdfCache({ maxAgeDays: 365, maxBytes: 40 });

  expect(unlink).toHaveBeenCalledTimes(1);
  expect(unlink).toHaveBeenCalledWith(expect.stringContaining('a.pdf'));
});

test('trims oldest-first until under the cap, not just one file', async () => {
  const now = Date.now();
  ls.mockResolvedValue(['a.pdf', 'b.pdf', 'c.pdf']);
  statFor({
    'a.pdf': { size: 30, lastModified: now - 3 * DAY_MS },
    'b.pdf': { size: 30, lastModified: now - 2 * DAY_MS },
    'c.pdf': { size: 30, lastModified: now - 1 * DAY_MS },
  });

  await sweepPdfCache({ maxAgeDays: 365, maxBytes: 40 });

  expect(unlink).toHaveBeenCalledTimes(2);
  expect(unlink).toHaveBeenNthCalledWith(1, expect.stringContaining('a.pdf'));
  expect(unlink).toHaveBeenNthCalledWith(2, expect.stringContaining('b.pdf'));
});

test('never throws, even when listing the directory fails', async () => {
  ls.mockRejectedValue(new Error('boom'));
  await expect(sweepPdfCache({ maxAgeDays: 7, maxBytes: 100 })).resolves.toBeUndefined();
  expect(unlink).not.toHaveBeenCalled();
});

test('a stat failure on one file does not stop the rest of the sweep', async () => {
  const now = Date.now();
  ls.mockResolvedValue(['broken.pdf', 'old.pdf']);
  stat.mockImplementation(async (path: string) => {
    if (path.endsWith('broken.pdf')) throw new Error('stat failed');
    return { type: 'file' as const, path, filename: 'old.pdf', size: 10, lastModified: now - 10 * DAY_MS };
  });

  await sweepPdfCache({ maxAgeDays: 7, maxBytes: 50 * 1024 * 1024 });

  expect(unlink).toHaveBeenCalledTimes(1);
  expect(unlink).toHaveBeenCalledWith(expect.stringContaining('old.pdf'));
});
