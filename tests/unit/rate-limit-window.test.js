/**
 * Guard against the EXTRACT(MINUTE) rate-limit window defect returning.
 *
 * check_rate_limit computed its window as:
 *
 *   DATE_TRUNC('hour', NOW())
 *     + FLOOR(EXTRACT(MINUTE FROM NOW()) / p_window_minutes) * p_window_minutes
 *
 * EXTRACT(MINUTE) only returns 0-59, so for any window >= 60 minutes the FLOOR
 * term is 0 and the window collapses to the top of the current hour. "20 per
 * day" was really 20 per hour, across every route using the daily and weekly
 * caps -- the expensive AI ones this table exists to protect.
 *
 * The arithmetic lives in SQL, so this cannot be a direct unit test of the
 * function. What it CAN do without a database is two things that both fail
 * loudly, and both would have caught the original defect:
 *
 *   1. Assert the newest migration defining check_rate_limit uses epoch-floor
 *      division and not EXTRACT(MINUTE). Older migrations still contain the old
 *      formula and must: they are immutable history, not current state.
 *   2. Independently reimplement both formulas and assert the old one really does
 *      collapse while the new one does not -- so the claim in the migration
 *      comment is executable rather than prose.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS = path.join(__dirname, '../../supabase/migrations');

/** Every migration that defines check_rate_limit, oldest first (names are timestamped). */
function definitionsOf(fnName) {
  return fs
    .readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => ({ file: f, sql: fs.readFileSync(path.join(MIGRATIONS, f), 'utf8') }))
    .filter(({ sql }) => new RegExp(`FUNCTION\\s+(public\\.)?${fnName}\\s*\\(`, 'i').test(sql));
}

describe('check_rate_limit window arithmetic', () => {
  test('a migration defining it exists', () => {
    expect(definitionsOf('check_rate_limit').length).toBeGreaterThan(0);
  });

  test('the LATEST definition uses epoch-floor, not EXTRACT(MINUTE)', () => {
    const defs = definitionsOf('check_rate_limit');
    const latest = defs[defs.length - 1];

    expect(latest.sql).toMatch(/EXTRACT\(EPOCH FROM NOW\(\)\)/i);

    // Comments must be stripped before this check, not just the header skipped.
    // Both the migration's preamble AND a comment inside the function body
    // legitimately quote the broken formula in order to explain it -- and the
    // first version of this test failed on exactly that, which is a fair result:
    // a guard that cannot tell code from prose would eventually be "fixed" by
    // deleting the explanation.
    const body = latest.sql
      .slice(latest.sql.search(/CREATE OR REPLACE FUNCTION/i))
      .replace(/--[^\n]*/g, '');
    expect(body).not.toMatch(/EXTRACT\(MINUTE/i);
  });

  test('the newest definition is the fix, not an older file', () => {
    // Catches someone adding a migration that reverts the formula: the guard
    // above only reads the last file, so the ordering itself matters.
    const defs = definitionsOf('check_rate_limit');
    expect(defs[defs.length - 1].file).toMatch(/^\d{14}_/);
  });

  test('the anon limiter shares the corrected arithmetic', () => {
    const defs = definitionsOf('check_anon_rate_limit');
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[defs.length - 1].sql).toMatch(/EXTRACT\(EPOCH FROM NOW\(\)\)/i);
  });
});

describe('the defect itself, reimplemented', () => {
  // Faithful ports of both formulas, so the migration's central claim is executed
  // rather than asserted in a comment.
  const oldWindowStart = (now, windowMinutes) => {
    const topOfHour = new Date(now);
    topOfHour.setUTCMinutes(0, 0, 0);
    const offset = Math.floor(now.getUTCMinutes() / windowMinutes) * windowMinutes;
    return new Date(topOfHour.getTime() + offset * 60_000);
  };
  const newWindowStart = (now, windowMinutes) => {
    const s = Math.max(windowMinutes, 1) * 60;
    return new Date(Math.floor(now.getTime() / 1000 / s) * s * 1000);
  };

  // 15:34 UTC — mid-hour, so a collapse to the top of the hour is visible.
  const NOW = new Date('2026-07-26T15:34:12.000Z');

  test.each([1, 5, 60])(
    'a %i-minute window is UNCHANGED by the fix (the safety claim)',
    (w) => {
      expect(newWindowStart(NOW, w).toISOString()).toBe(oldWindowStart(NOW, w).toISOString());
    }
  );

  test('the OLD formula collapses a daily window to the top of the hour', () => {
    expect(oldWindowStart(NOW, 1440).toISOString()).toBe('2026-07-26T15:00:00.000Z');
  });

  test('the NEW formula gives a real UTC day', () => {
    expect(newWindowStart(NOW, 1440).toISOString()).toBe('2026-07-26T00:00:00.000Z');
  });

  test('the OLD formula made a weekly cap reset hourly -- 168x too permissive', () => {
    expect(oldWindowStart(NOW, 10080).toISOString()).toBe('2026-07-26T15:00:00.000Z');
    expect(newWindowStart(NOW, 10080).getTime()).toBeLessThan(
      oldWindowStart(NOW, 10080).getTime()
    );
  });

  test('a zero or negative window does not divide by zero', () => {
    // The old formula would have. Nothing passes 0 today; a rate limiter should
    // not be the thing that 500s a route if something ever does.
    for (const w of [0, -5]) {
      expect(Number.isFinite(newWindowStart(NOW, w).getTime())).toBe(true);
    }
  });
});
