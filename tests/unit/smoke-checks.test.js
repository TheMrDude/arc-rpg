/**
 * Proof that the smoke test's guards can fail.
 *
 * The smoke suite had four hollow-pass paths: three of them are decisions, and a
 * decision that only executes during a run needing the production service-role
 * key cannot be verified in CI. So the decisions live in tests/smoke/checks.js
 * and are exercised here on every push, in BOTH directions -- pass and fail.
 *
 * The fourth path (clearRewardModals swallowing click failures) needs a real
 * browser and is proven in tests/overlays/reward-dismiss.spec.js.
 */
const { smokeCredentials, buildMismatchReason, stepLedger } = require('../smoke/checks');

describe('smokeCredentials -- hollow pass 3: retries reused one account', () => {
  test('a retry gets a different address from the first attempt', () => {
    const first = smokeCredentials('run-1', 0);
    const retry = smokeCredentials('run-1', 1);
    expect(retry.email).not.toBe(first.email);
    expect(retry.password).not.toBe(first.password);
  });

  test('the first attempt keeps the plain run id', () => {
    expect(smokeCredentials('run-1', 0).email).toBe('smoke+run-1@habitquest.dev');
  });

  test('every attempt is unique across a plausible retry range', () => {
    const seen = new Set(
      Array.from({ length: 5 }, (_, i) => smokeCredentials('run-1', i).email)
    );
    expect(seen.size).toBe(5);
  });

  test('the prefix is preserved so cleanup and user-count exclusion still match', () => {
    // SELECT count(*) FROM profiles WHERE email NOT LIKE 'smoke+%' depends on this.
    for (let retry = 0; retry < 3; retry++) {
      expect(smokeCredentials('run-1', retry).email.startsWith('smoke+')).toBe(true);
    }
  });

  test('the password still satisfies upper/lower/digit/symbol', () => {
    const { password } = smokeCredentials('run-1', 2);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
  });
});

describe('buildMismatchReason -- hollow pass 4: never checked WHICH build', () => {
  const sha = 'abcdef1234567890abcdef';
  const deployed = { buildId: 'abcdef123456' };

  test('the matching build passes', () => {
    expect(buildMismatchReason(sha, deployed)).toBeNull();
  });

  test('a stale build FAILS -- the deploy failed and the old bundle is still live', () => {
    const reason = buildMismatchReason(sha, { buildId: '999999999999' });
    expect(reason).toMatch(/WRONG BUILD/);
    expect(reason).toContain('999999999999');
    expect(reason).toContain('abcdef123456');
  });

  test('a NEWER build landing mid-run FAILS too, not just an older one', () => {
    expect(buildMismatchReason(sha, { buildId: 'fedcba098765' })).toMatch(/WRONG BUILD/);
  });

  test('the "dev" fallback FAILS even with no expected sha', () => {
    // This is the manual-dispatch path. It must still be impossible to pass
    // without knowing what was tested.
    expect(buildMismatchReason(null, { buildId: 'dev' })).toMatch(/not inlined at build time/);
    expect(buildMismatchReason(sha, { buildId: 'dev' })).toMatch(/not inlined at build time/);
  });

  test('a missing or empty buildId FAILS', () => {
    expect(buildMismatchReason(sha, {})).toMatch(/no build information/);
    expect(buildMismatchReason(sha, { buildId: '' })).toMatch(/no build information/);
    expect(buildMismatchReason(sha, null)).toMatch(/no build information/);
    expect(buildMismatchReason(sha, undefined)).toMatch(/no build information/);
  });

  test('no expected sha with a real build id is allowed, and only then', () => {
    // Manual dispatch: everything knowable has been checked. The caller
    // annotates the run as unasserted rather than claiming a match.
    expect(buildMismatchReason(null, deployed)).toBeNull();
    expect(buildMismatchReason('', deployed)).toBeNull();
  });

  test('comparison is on the 12-char prefix next.config.js actually inlines', () => {
    expect(buildMismatchReason('abcdef123456', deployed)).toBeNull();
    // An 11-char prefix must NOT be accepted as a match.
    expect(buildMismatchReason(sha, { buildId: 'abcdef12345' })).toMatch(/WRONG BUILD/);
  });
});

describe('stepLedger -- hollow pass 1: a skipped check left no trace', () => {
  const required = ['build identity', 'signup', 'xp and gold increased'];

  test('all steps run: clean', () => {
    const { missing, undeclared } = stepLedger(required, new Set(required));
    expect(missing).toEqual([]);
    expect(undeclared).toEqual([]);
  });

  test('a skipped check is NAMED rather than silently passing', () => {
    const { missing } = stepLedger(required, new Set(['build identity', 'signup']));
    expect(missing).toEqual(['xp and gold increased']);
  });

  test('a run where nothing executed does not report success', () => {
    expect(stepLedger(required, new Set()).missing).toEqual(required);
  });

  test('a renamed step is caught in both directions -- the way this guard would rot', () => {
    // Someone renames the step but not REQUIRED_STEPS. Without the undeclared
    // half, `missing` alone would flag it; without `missing`, a rename that also
    // dropped a check would slip through. Both halves are load-bearing.
    const ran = new Set(['build identity', 'signup', 'xp/gold went up']);
    const { missing, undeclared } = stepLedger(required, ran);
    expect(missing).toEqual(['xp and gold increased']);
    expect(undeclared).toEqual(['xp/gold went up']);
  });

  test('accepts an array as well as a Set', () => {
    expect(stepLedger(required, required).missing).toEqual([]);
  });
});
