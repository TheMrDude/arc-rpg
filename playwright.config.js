// Playwright is used for exactly one thing: the production smoke test that runs
// after every deploy. Unit and security tests stay on Jest.
//
// testDir is pinned to tests/smoke so `playwright test` can never pick up the
// Jest suites in tests/security.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/smoke',
  // The five checks are one user's path, so they run in order in a single file
  // and a failure early makes the rest meaningless. No sharding, no parallelism.
  fullyParallel: false,
  workers: 1,
  // One retry: this hits a live network, a live AI call and a live database, and
  // a single flake should not page anyone. Two failures in a row is a real
  // signal. Retries re-run the whole file, which re-creates the account -- that
  // is deliberate, because a half-finished account is not a valid starting state.
  retries: 1,
  // A transform-quest call is an LLM round trip; the default 30s is too tight
  // for three of them plus signup.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'https://habitquest.dev',
    // Kept on failure only: a trace of a passing run is noise, and a trace of a
    // failing run is the whole reason you are looking.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'mobile-chromium',
      // She uses a tablet. Testing a desktop viewport would miss the layout the
      // actual user sees.
      use: { ...devices['Pixel 7'] },
    },
  ],
});
