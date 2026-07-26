// Jest runs unit tests over pure functions in lib/. That is all it does.
//
// It used to "run" 49 tests across five files in tests/security. Every one of
// them either made an HTTP request to http://localhost:3000 with no server
// running, or was `expect(true).toBe(true)` next to a comment describing a test
// someone intended to write. None imported a single line of this codebase --
// they could not, because Jest had no ESM transform. They have been deleted
// rather than skipped, because a green file named payment.test.js containing a
// test called "should validate Stripe signature on webhook" that has never once
// executed is worse than having no file at all.
//
// What replaced them is in tests/unit: fewer tests, all of which call real code
// and can fail. See tests/README.md for the coverage that genuinely exists and
// the gaps that do not.
module.exports = {
  testEnvironment: 'node',
  // tests/unit only. Playwright owns tests/smoke and tests/overlays, and a
  // stray *.test.js elsewhere should not silently join this run.
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  // Without this, `import`/`export` in lib/ throws and a test can only reach the
  // app over HTTP. This is the difference between unit tests and no unit tests.
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': '<rootDir>/tests/esbuild-transform.js',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['lib/**/*.js', '!**/node_modules/**', '!**/.next/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // An empty run must be a failure. If a bad testMatch or a deleted directory
  // leaves Jest with nothing to do, CI has to go red rather than report success
  // on zero tests -- that is the same hollow pass this cleanup exists to remove.
  passWithNoTests: false,
  verbose: true,
};
