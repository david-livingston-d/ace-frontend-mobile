module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  // The RN preset's own `transform` only matches .js/.ts/.tsx, so its regex has
  // to be repeated here (not merely extended) with `.mjs` added — msw's ESM-only
  // transitive deps (rettime et al., see transformIgnorePatterns below) ship as
  // .mjs and are otherwise never routed through babel-jest at all.
  transform: {
    '^.+\\.(js|jsx|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
  transformIgnorePatterns: [
    // msw's published CJS build calls `require("rettime")`, but rettime (and a
    // few of its own transitive deps) ship ESM-only with no CJS entry point —
    // a real gap in msw@2.15's package, not a jest quirk. Let babel-jest
    // transpile these specific packages (import/export -> require/exports)
    // instead of skipping them like the rest of node_modules.
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@gorhom|posthog-react-native|lucide-react-native|rettime|@mswjs|@open-draft|headers-polyfill|until-async|tough-cookie)/)',
  ],
  testEnvironment: 'node',
};
