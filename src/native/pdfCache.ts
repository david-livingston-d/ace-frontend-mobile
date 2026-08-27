import ReactNativeBlobUtil from 'react-native-blob-util';
import { aceDir } from './files';

type CacheEntry = { path: string; size: number; lastModified: number };

/**
 * Every `downloadAuthedPdf` (`src/native/pdf.ts`) call leaves a file under
 * `DocumentDir/ace` forever — nothing else on this device ever deletes one.
 * Called on app foreground (`App.tsx`) to keep that directory bounded: first
 * anything older than `maxAgeDays` goes, then — if the survivors still add up
 * to more than `maxBytes` — the oldest of what's left goes too, until the
 * total is back under the cap.
 *
 * Never throws: a sweep is best-effort housekeeping, not something a caller
 * should have to guard with its own try/catch, and a failure here must never
 * be the reason the app fails to come to the foreground.
 */
export async function sweepPdfCache({
  maxAgeDays,
  maxBytes,
}: {
  maxAgeDays: number;
  maxBytes: number;
}): Promise<void> {
  try {
    const dir = await aceDir();
    const names = await ReactNativeBlobUtil.fs.ls(dir);
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

    const entries: CacheEntry[] = [];
    for (const name of names) {
      const path = `${dir}/${name}`;
      try {
        const stat = await ReactNativeBlobUtil.fs.stat(path);
        if (stat.type !== 'file') continue;
        entries.push({ path, size: Number(stat.size) || 0, lastModified: Number(stat.lastModified) || 0 });
      } catch {
        // One unreadable entry (removed mid-sweep, a permissions blip) never
        // stops the rest of the sweep.
      }
    }

    const survivors: CacheEntry[] = [];
    for (const entry of entries) {
      if (now - entry.lastModified > maxAgeMs) {
        await ReactNativeBlobUtil.fs.unlink(entry.path).catch(() => undefined);
      } else {
        survivors.push(entry);
      }
    }

    let totalBytes = survivors.reduce((sum, entry) => sum + entry.size, 0);
    if (totalBytes > maxBytes) {
      const oldestFirst = [...survivors].sort((a, b) => a.lastModified - b.lastModified);
      for (const entry of oldestFirst) {
        if (totalBytes <= maxBytes) break;
        await ReactNativeBlobUtil.fs.unlink(entry.path).catch(() => undefined);
        totalBytes -= entry.size;
      }
    }
  } catch {
    // See the doc comment above — a sweep failure (e.g. `ls` on a directory
    // that doesn't exist yet) must never propagate.
  }
}
