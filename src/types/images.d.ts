// The RN CLI TypeScript template doesn't ship module declarations for static image
// assets — metro resolves `require('./x.png')` fine at bundle time, but `tsc` needs
// this shim so `import x from './x.png'` (used by the wordmark on Splash/Login) typechecks.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
