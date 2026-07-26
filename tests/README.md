# Tests

What is actually verified, and what is not. Read the second half.

## What runs

| Suite | Runner | Runs on | Count | Needs |
|---|---|---|---|---|
| `tests/unit/` | Jest | every push + PR (`unit.yml`) | 103 | nothing |
| `tests/overlays/` | Playwright | every push + PR (`overlays.yml`) | 22 | Chromium + `next build` |
| `tests/smoke/` | Playwright | after each production deploy (`smoke.yml`) | 13 checks | live prod + service-role key |
| `scripts/verify-guards.mjs` | node | `prebuild` + `unit.yml` | 4 guards | nothing |
| `scripts/prove-overlay-guards.mjs` | node | on demand | 10 mutations | Chromium |

```bash
npm test              # jest, tests/unit only
npm run test:overlays # playwright overlay invariants
npm run test:smoke    # playwright against production
npm run verify:guards # prove ESLint's no-undef can fail
```

## What was deleted, and why

`tests/security/` contained five files and 49 tests. It reported **46 passing**. The
real number of tests that verified anything was **zero**. Deleted, not skipped:

| File | Tests | What they actually did |
|---|---|---|
| `auth.test.js` | 9 | Suite threw on import — `Missing Supabase credentials`. Never ran once. |
| `input-validation.test.js` | 14 | All 14 `fetch('http://localhost:3000/...')`, all behind `if (!token) return`. |
| `payment.test.js` | 19 | 5 fetched localhost; 14 were `expect(true).toBe(true)` beside a comment. |
| `race-conditions.test.js` | 9 | 4 fetched localhost; 5 were `expect(true).toBe(true)`. |
| `rate-limiting.test.js` | 7 | All 7 fetched localhost via a helper, all behind a token check. |

Two things made this invisible:

1. **No server.** Every request went to `http://localhost:3000`, which is not
   running in CI or on a laptop during `npm test`. The tests early-returned on a
   missing `TEST_USER_TOKEN` before reaching the request, so they reported green.
2. **No ESM transform.** Jest could not parse `import`/`export`, so
   `require('../lib/premium')` threw. *No test in this repository could import a
   line of application code.* That is why every suite reached for HTTP instead.
   Fixed by `tests/esbuild-transform.js`.

The file named `payment.test.js` held a test called *"should validate Stripe
signature on webhook"* that had never executed. A green suite with that name is
worse than no file, because it answers a question it never asked.

The old `tests/README.md` claimed, with checkmarks, that SQL injection
prevention, XSS prevention, payment security and race-condition atomicity were
all verified. None of them were.

## Coverage that genuinely exists

**Unit (103)** — real functions, called directly, each proven to fail under mutation:

- `isPremium()` (8) — the comped shape (`is_premium` true + subscription
  inactive), Stripe-only subscribers, `subscription_tier` explicitly *not* an
  entitlement, null-safety, no truthy coercion.
- `countHabitsTowardLimit()` (7) — the recurring-instance accumulation defect
  that locked a 3-habit user out of creating a fourth.
- `createRateLimitResponse()` (7) — 429 shape, headers, `Remaining` never
  negative, burst vs daily copy, no raw reason codes shown to a user.
- Narration floor (13) — all **ten** child-facing AI routes import
  `NARRATION_FLOOR` (including `preview-quest`, the unauthenticated landing-page
  demo), the stealth rule survives, **and a new Anthropic route that skips the
  floor fails the build** unless explicitly exempted with a reason.
- Stripe webhook signatures (16) — both live webhook routes, against the real
  Stripe SDK with real HMAC signatures. Unsigned, garbage-signed, wrong-secret,
  tampered-body, stale-timestamp replay, and a byte-different-but-JSON-equal body
  are each rejected; a correctly signed payload is accepted. Proven by three
  mutations, including turning the verification failure into a 200.
- `parseQuestLine` / `salvageQuestText` (18) — the malformed-response path shared
  by `transform-quest` and `preview-quest`. Every leak marker, the word bound, and
  a format-compliant line that still leaked instructions.
- Rate-limit window arithmetic (11) — the `EXTRACT(MINUTE)` defect, now fixed.
  Both formulas are reimplemented so the safety claim is executable: windows of
  1, 5 and 60 minutes are byte-identical before and after, and only the daily and
  weekly ones move. A migration that reverted the formula fails this suite.
- Anonymous rate limiting (14) — the spoofable-IP bypass, written from the
  attacker's side: a rotating fake `x-forwarded-for` prefix must land in one
  bucket, and an unidentifiable caller must be denied rather than pooled.

- Smoke-test guards (17) — the three hollow-pass decisions from the smoke suite
  (`tests/smoke/checks.js`), each asserted in both directions: a stale build, a
  newer build landing mid-run, a `dev` build id, a retry reusing one account, and
  a declared check that never executed.

**Overlay invariants (22)** — one shell, three close paths, scroll lock restores,
4.5:1 contrast measured in a browser, no z-index above the band, and six fixtures
proving `clearRewardModals` goes red on a modal a child could not dismiss. 9 of 10
deliberate breaks detected; the tenth is labelled unproven in
`scripts/prove-overlay-guards.mjs`.

**Production smoke (13 checks)** — build identity first, then signup, quest
creation through the live AI route, completion, contrast, hatching. A step ledger
asserts every declared check actually executed.

## Coverage that does NOT exist

Deleting the fake suites did not create these gaps; it revealed them. Nothing
below is tested today:

| Area | Status |
|---|---|
| Checkout auth (401 on no/invalid token) | **Untested.** Was three localhost tests. |
| SQL injection / XSS on quest + journal input | **Untested.** RLS and parameterised queries are the actual defence; neither is asserted. |
| Founder-spot atomicity | **Untested.** Needs concurrent calls against a real DB. |
| Quest-completion double-award | **Untested.** Was covered by placeholders. |
| Rate limit *enforcement* (only the 429 shape is covered) | **Untested.** Needs a DB. |
| `aiDifficulty = 'easy'` on parse failure | **Partly covered.** `parseQuestLine` is tested; the route's XP-downgrade branch around it is not. |
| Rate limit *enforcement* against a live database | **Untested in CI.** The window arithmetic is guarded by `rate-limit-window.test.js`, and enforcement was verified against production with a forced-rollback probe, but nothing exercises the RPC on every commit — that would need a database in CI. |

## Rules for adding a test here

1. **It must import the code it tests.** A test that only makes HTTP requests to
   a server nobody starts is not a test.
2. **Prove it can fail.** Break the thing on purpose, watch it go red, restore.
   `scripts/prove-overlay-guards.mjs` is the pattern.
3. **No `expect(true).toBe(true)`.** If the test cannot be written yet, write the
   gap into the table above instead. A documented gap is honest; a passing
   placeholder is a lie with a green tick next to it.
4. **No skip-on-missing-env.** `if (!process.env.X) return` turns an unrun test
   into a passing one. Either the test runs everywhere or it does not exist.
