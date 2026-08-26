import ReactNativeBlobUtil from 'react-native-blob-util';

let dirReady: Promise<string> | null = null;

/** `${DocumentDir}/ace`, created once per process if it doesn't already exist —
 * every PDF `downloadAuthedPdf` saves lands here. */
export function aceDir(): Promise<string> {
  if (!dirReady) {
    dirReady = (async () => {
      const dir = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ace`;
      const exists = await ReactNativeBlobUtil.fs.exists(dir);
      if (!exists) await ReactNativeBlobUtil.fs.mkdir(dir);
      return dir;
    })();
  }
  return dirReady;
}
