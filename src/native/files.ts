import ReactNativeBlobUtil from 'react-native-blob-util';

let dirReady: Promise<string> | null = null;

/** `${DocumentDir}/ace`, created once per process if it doesn't already exist —
 * every PDF `downloadAuthedPdf` saves lands here.
 *
 * A *failed* creation is deliberately not memoised: caching the rejected
 * promise would turn one transient filesystem error into a dead PDF button for
 * the rest of the app's life, with every later download rejecting on the stale
 * failure rather than trying again. */
export function aceDir(): Promise<string> {
  if (!dirReady) {
    dirReady = (async () => {
      const dir = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ace`;
      const exists = await ReactNativeBlobUtil.fs.exists(dir);
      if (!exists) await ReactNativeBlobUtil.fs.mkdir(dir);
      return dir;
    })();
    dirReady.catch(() => {
      dirReady = null;
    });
  }
  return dirReady;
}
