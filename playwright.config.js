// Playwright is used for exactly one thing: the production smoke test that runs
// after every deploy. Unit and security tests stay on Jest.
//
// testDir is pinned to tests/smoke so `playwright test` can never pick up the
// Jest suites in tests/security.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
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
      // Production smoke: runs after deploy, needs the network.
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.js/,
      // She uses a tablet. Testing a desktop viewport would miss the layout the
      // actual user sees.
      use: { ...devices['Pixel 7'] },
    },
    {
      // Overlay invariants: no network, no production writes, fast enough to gate
      // every push. Fire tablet viewport, which is where the traps were found.
      name: 'overlays',
      testMatch: /overlays\/.*\.spec\.js/,
      retries: 0,
      timeout: 60_000,
      use: {
        viewport: { width: 600, height: 960 },
        baseURL: undefined,
        // Geometry assertions must not race the open animation: mid-flight the
        // surface is still at scale(0.98), which measured the 44px close button
        // at 43.4px. This also exercises the reduced-motion path.
        reducedMotion: 'reduce',
        // CI installs its own Chromium. A sandbox with one pre-installed can
        // point at it instead via PW_CHROMIUM_PATH; unset, this is a no-op.
        ...(process.env.PW_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
});
