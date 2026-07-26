/**
 * The smoke test's pure decisions, extracted so they can be proven.
 *
 * These three functions are the fixes for three of the four hollow-pass paths.
 * Left inline in production.spec.js they would only ever execute during a run
 * that needs the production service-role key, which means a mistake in the
 * guard itself could not be caught in CI -- the same class of problem as an
 * ESLint config that is invalid for two days. Out here they are unit-tested on
 * every push by tests/unit/smoke-checks.test.js.
 */

/**
 * A distinct account per retry attempt.
 *
 * Playwright's `retries: 1` re-runs the whole file. Derived once at module
 * scope, the address was identical on attempt 2, so the retry signed in to the
 * account the failed attempt had left half-built -- not a valid starting state
 * for a test whose first assertions are about first-run state.
 */
function smokeCredentials(runId, retry = 0, prefix = 'smoke+') {
  const id = retry > 0 ? `${runId}-r${retry}` : String(runId);
  return { email: `${prefix}${id}@habitquest.dev`, password: `Smoke!${id}aA1` };
}

/**
 * Why the deployed build is not the build under test, or null if it is fine.
 *
 * Returns a string (the failure reason) rather than throwing, so the caller
 * decides how to report and so this is trivially testable in both directions.
 */
function buildMismatchReason(expectedSha, version, { shaLength = 12 } = {}) {
  if (!version || typeof version !== 'object') {
    return 'no build information: /api/version returned nothing usable';
  }
  const { buildId } = version;
  if (!buildId) return 'no build information: /api/version returned no buildId';

  // 'dev' is the next.config.js fallback when VERCEL_GIT_COMMIT_SHA is absent.
  // Serving it in production means the build id was never inlined, so the suite
  // cannot identify what it tested -- a failure, never a pass.
  if (buildId === 'dev') {
    return 'production is serving buildId "dev": NEXT_PUBLIC_BUILD_ID was not inlined at build time';
  }

  // No expected sha (manual dispatch at an arbitrary URL). Everything knowable
  // has been checked; the caller annotates the run as unasserted.
  if (!expectedSha) return null;

  const expected = String(expectedSha).slice(0, shaLength);
  if (buildId !== expected) {
    return (
      `WRONG BUILD: expected ${expected} but production is serving ${buildId}. ` +
      'Either the deploy failed and the previous build is still live, or a newer ' +
      'deploy replaced it mid-run.'
    );
  }
  return null;
}

/**
 * Which declared checks never executed.
 *
 * A Playwright test.step that does not run leaves no trace, so a green tick is
 * compatible with having checked less than the suite claims. `missing` catches a
 * skipped check; `undeclared` catches a step renamed without the ledger being
 * updated, which is how this guard would otherwise quietly rot into a no-op.
 */
function stepLedger(required, ran) {
  const actual = ran instanceof Set ? [...ran] : Array.from(ran || []);
  return {
    missing: required.filter((s) => !actual.includes(s)),
    undeclared: actual.filter((s) => !required.includes(s)),
  };
}

module.exports = { smokeCredentials, buildMismatchReason, stepLedger };
