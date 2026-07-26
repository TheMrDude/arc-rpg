/**
 * Production smoke test.
 *
 * Runs against the real deployed app after every production deploy, because
 * everything that has actually broken for a real user passed a local build:
 * a missing import that only threw at request time, white text on a white
 * field, and a stale service worker serving a bundle that was fine when it
 * was built.
 *
 * Six checks, one account, one browser, in order. It is deliberately one
 * user's path rather than six independent tests -- if signup breaks, the
 * others cannot tell you anything, and pretending otherwise just produces
 * five more red lines to read.
 *
 * It writes to the production database: one account and three quests per
 * deploy, deleted at the end. Accounts are prefixed `smoke+` so they can be
 * excluded from any user count:
 *
 *   SELECT count(*) FROM profiles WHERE email NOT LIKE 'smoke+%';
 */
const { test, expect } = require('@playwright/test');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SMOKE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SMOKE_SERVICE_ROLE_KEY;

// Prefix is the tag. Anything matching it is CI's, never a person's.
const SMOKE_PREFIX = 'smoke+';
const STALE_ACCOUNT_MS = 60 * 60 * 1000;

const admin =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

const runId = `${process.env.GITHUB_RUN_ID || Date.now()}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`;
const email = `${SMOKE_PREFIX}${runId}@habitquest.dev`;
const password = `Smoke!${runId}aA1`;

let userId = null;

async function findUserByEmail(target) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = (data?.users || []).find((u) => u.email === target);
    if (hit) return hit;
    if (!data?.users?.length || data.users.length < 200) return null;
  }
  return null;
}

/** Every table that references the user cascades from auth.users, so this is enough. */
async function deleteUser(id) {
  if (!id) return;
  await admin.auth.admin.deleteUser(id).catch(() => {});
}

/**
 * Clear out anything a previous crashed run left behind. Without this a series
 * of failures silently inflates the user count, which is the thing we were
 * asked not to do.
 */
async function sweepStaleSmokeAccounts() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const stale = (data?.users || []).filter(
    (u) =>
      u.email?.startsWith(SMOKE_PREFIX) &&
      Date.now() - new Date(u.created_at).getTime() > STALE_ACCOUNT_MS
  );
  for (const u of stale) await deleteUser(u.id);
  if (stale.length) console.log(`swept ${stale.length} stale smoke account(s)`);
}

async function readProfile(id) {
  const { data } = await admin
    .from('profiles')
    .select('xp, gold, level, quests_completed, companion_name')
    .eq('id', id)
    .maybeSingle();
  return data;
}

/**
 * Dismiss whatever the reward chain put on screen. Completing a quest can queue
 * a celebration, a reflection, a dice roll and a chest drop, and which of them
 * appear is partly random -- so this drains rather than assumes.
 */
async function clearRewardModals(page) {
  const labels =
    /Continue Your Journey|Continue|Claim|Awesome|Nice|Got it|Keep going|Close|Skip/i;
  for (let i = 0; i < 8; i++) {
    const button = page.getByRole('button', { name: labels }).first();
    if (!(await button.count())) break;
    if (!(await button.isVisible().catch(() => false))) break;
    await button.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
}

test.beforeAll(() => {
  // A smoke test that silently skips is worse than no smoke test: it is a green
  // tick that means nothing.
  if (!admin) {
    throw new Error(
      'SMOKE_SUPABASE_URL and SMOKE_SERVICE_ROLE_KEY are required. ' +
        'Email confirmation is enabled, so the test cannot reach the dashboard without them.'
    );
  }
});

test.afterAll(async () => {
  await deleteUser(userId);
  if (userId) {
    const left = await readProfile(userId);
    if (left) console.warn(`cleanup left a profile behind for ${userId}`);
  }
});

test('production smoke: the five paths a real user touches', async ({ page }) => {
  await sweepStaleSmokeAccounts();

  const failures = [];
  page.on('response', (res) => {
    if (res.url().includes('/api/') && res.status() >= 500) {
      failures.push(`${res.status()} ${new URL(res.url()).pathname}`);
    }
  });

  // ── 1. Sign up and reach the dashboard ────────────────────────────────────
  await test.step('sign up and reach the dashboard', async () => {
    await page.goto('/signup');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);

    // The submit button is `disabled={loading || !isGuardian}`: signup is gated
    // behind the grown-up affirmation checkbox, which is a real COPPA control and
    // not something to route around. A person has to tick it, so the test does
    // too. This is the step the first live run died on -- the selector harness
    // only covered dashboard components, never this form.
    const guardian = page.locator('input[type="checkbox"]').first();
    await guardian.check();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await page.locator('button[type="submit"]').click();

    // Email confirmation is on, so the UI stops here. Confirm out of band --
    // this is the only step the test cannot do the way a person would.
    await page.waitForTimeout(6000);
    const user = await findUserByEmail(email);
    expect(user, 'signup did not create an auth user').toBeTruthy();
    userId = user.id;
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });

    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(select-archetype|dashboard)/, { timeout: 45_000 });

    if (page.url().includes('select-archetype')) {
      await expect(page.getByRole('heading', { name: /Choose Your Egg/i })).toBeVisible();
      await page.getByRole('button', { name: /Take this egg/i }).first().click();
    }

    await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /^Level \d+$/ })).toBeVisible({
      timeout: 30_000,
    });
  });

  // ── 5a. Companion at the correct stage for 0 quests ───────────────────────
  await test.step('companion renders as an egg with the hatch countdown', async () => {
    const profile = await readProfile(userId);
    expect(profile.quests_completed || 0).toBe(0);
    await expect(page.getByText(/Hatches in 3 quests/i)).toBeVisible();
  });

  // ── 4. The recurrence control renders ─────────────────────────────────────
  await test.step('the recurrence control renders', async () => {
    // Guarded by `{setRecurrence && …}` in QuestInputRedesigned, so it can
    // vanish silently if a refactor stops passing the prop. That is the whole
    // reason this check exists.
    const group = page.getByRole('group', { name: /How often/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole('button')).toHaveCount(3);
    for (const label of ['Every day', 'Every week', 'Just once']) {
      await expect(group.getByRole('button', { name: new RegExp(label, 'i') })).toBeVisible();
    }
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
  });

  // ── 2 & 3. Create quests, complete them, watch XP and gold move ───────────
  const before = await readProfile(userId);

  for (let n = 1; n <= 3; n++) {
    await test.step(`create quest ${n} (transform-quest returns a transformed result)`, async () => {
      const raw = `smoke test quest ${n}`;
      const waitForTransform = page.waitForResponse(
        (r) => r.url().includes('/api/transform-quest') && r.request().method() === 'POST',
        { timeout: 90_000 }
      );

      await page.getByPlaceholder('Enter your task...').fill(raw);
      await page.getByRole('button', { name: /Add Quest/i }).click();

      const res = await waitForTransform;
      expect(res.status(), `transform-quest returned ${res.status()}`).toBeLessThan(300);

      const body = await res.json();
      const transformed = body.transformedText || body.transformed_text || '';
      // The bug that took quest creation down was a 500. The bug worth guarding
      // against next is a 200 that transformed nothing.
      expect(transformed.length, 'transform-quest returned no text').toBeGreaterThan(0);
      expect(transformed.toLowerCase()).not.toBe(raw.toLowerCase());

      await expect(page.getByRole('button', { name: /^Complete$/ }).first()).toBeVisible({
        timeout: 30_000,
      });
    });

    await test.step(`complete quest ${n}`, async () => {
      const waitForComplete = page.waitForResponse(
        (r) => r.url().includes('/api/complete-quest') && r.request().method() === 'POST',
        { timeout: 60_000 }
      );
      await page.getByRole('button', { name: /^Complete$/ }).first().click();
      const res = await waitForComplete;
      expect(res.status(), `complete-quest returned ${res.status()}`).toBeLessThan(300);
      await clearRewardModals(page);
    });
  }

  await test.step('XP and gold both increased', async () => {
    const after = await readProfile(userId);
    expect(after.xp, `xp ${before.xp} -> ${after.xp}`).toBeGreaterThan(before.xp);
    expect(after.gold, `gold ${before.gold} -> ${after.gold}`).toBeGreaterThan(before.gold);
    expect(after.quests_completed).toBe(3);
  });

  // ── 6. The naming input is legible ────────────────────────────────────────
  await test.step('the hatch prompt appears and its input is legible', async () => {
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(/Your egg hatched/i)).toBeVisible();

    const input = dialog.locator('input[type="text"]');
    await expect(input).toBeEnabled({ timeout: 10_000 });
    await input.fill('Smokey');

    // She typed blind for five attempts because the value was correct and
    // invisible. toHaveValue would have passed then, so measure contrast.
    const ratio = await input.evaluate((el) => {
      const parse = (s) => {
        let m = s.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const p = m[1].split(',').map((x) => parseFloat(x.trim()));
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        }
        m = s.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
        if (m) return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: m[4] ? +m[4] : 1 };
        return null;
      };
      const over = (fg, bg) => ({
        r: fg.r * fg.a + bg.r * (1 - fg.a),
        g: fg.g * fg.a + bg.g * (1 - fg.a),
        b: fg.b * fg.a + bg.b * (1 - fg.a),
        a: 1,
      });
      const lum = (c) => {
        const f = (v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };

      const cs = getComputedStyle(el);
      // Walk up for the first opaque background, compositing anything translucent.
      const stack = [];
      for (let node = el; node; node = node.parentElement) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c && c.a > 0) {
          stack.push(c);
          if (c.a === 1) break;
        }
      }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = stack.length - 1; i >= 0; i--) bg = over(stack[i], bg);

      // -webkit-text-fill-color wins over color when both are set.
      const fill = cs.webkitTextFillColor;
      let fg = parse(fill && fill !== cs.color ? fill : cs.color);
      if (!fg) return 0;
      if (fg.a < 1) fg = over(fg, bg);

      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      return (hi + 0.05) / (lo + 0.05);
    });

    expect(ratio, `input text contrast was ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);

    await dialog.getByRole('button', { name: /^Name them$/ }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  });

  // ── 5b. Companion advanced to the hatched stage ───────────────────────────
  await test.step('companion advanced to stage 1 for 3 completed quests', async () => {
    const profile = await readProfile(userId);
    expect(profile.companion_name).toBe('Smokey');
    await expect(page.getByText(/Hatches in \d+ quest/i)).toBeHidden();
    await expect(page.getByText('Smokey').first()).toBeVisible();
  });

  expect(failures, `server errors during the run: ${failures.join(', ')}`).toEqual([]);
});
