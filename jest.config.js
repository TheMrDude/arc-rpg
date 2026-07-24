// Wrapped with next/jest so jest can transform the app's ESM `lib/*`
// modules (via SWC) without adding a project-wide babel config that would
// otherwise switch Next's compiler off SWC. All prior settings preserved.
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'app/api/**/*.js',
    'lib/**/*.js',
    '!**node_modules/**',
    '!**/.next/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000, // 30 seconds for API tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
};

module.exports = createJestConfig(customJestConfig);
