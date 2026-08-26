module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
    'react-native-worklets/plugin',
    // zod v4's ESM build (node_modules/zod/v4/classic/external.js, picked up by Metro
    // via the "module"/"import" package.json condition) uses `export * as core from
    // "../core/index.js"` — first exercised at runtime by Task 4's `loginSchema`
    // (`import { z } from 'zod'`). `@react-native/babel-preset` doesn't include this
    // transform (unlike @babel/preset-env), so Metro's bundle fails with "Export
    // namespace should be first transformed by
    // `@babel/plugin-transform-export-namespace-from`" without it. Already present
    // transitively (no new dependency added).
    '@babel/plugin-transform-export-namespace-from',
  ],
};
