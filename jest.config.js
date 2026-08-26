module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@gorhom|posthog-react-native|lucide-react-native)/)',
  ],
  testEnvironment: 'node',
};
