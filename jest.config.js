module.exports = {
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
