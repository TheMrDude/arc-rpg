# Security Audit — Badge layer + merged growth features

Audit of the Legendary Badge layer (contract, edge function, badge APIs,
migrations) and the funnel-measurement / testimonial code, plus the RLS the
badge eligibility depends on. Every High/Medium finding was reproduced and
verified by hand. This document records findings and the remediation applied in
this change.

## Findings & remediation

### 🔴 H1 — `profiles` stat columns were client-writable (badge eligibility + gameplay spoofing) — FIXED
The `profiles` UPDATE RLS policy pinned only `is_premium`; `quests_completed`,
`level`, `xp`, `longest_streak`, `story_progress`, `gold` were writable by any
authenticated user with the public anon key. A browser-console
`supabase.from('profiles').update({quests_completed:100, level:30, …})` let a
user fake their stats — cheating the whole gamification layer and spoofing
badge eligibility (the voucher signer re-verifies against these same columns).

**Fix:** `supabase/migrations/20260722000000_profiles_stat_columns_lockdown.sql`
revokes blanket `UPDATE` on `profiles` from `authenticated`/`anon` and grants it
back only on the single cosmetic column the browser legitimately writes
(`shown_premium_welcome`). All real stat writes already go through service-role
API routes, which bypass column grants.

### 🔴 H2 — Any user could publish unmoderated/impersonating testimonials to the public landing page — FIXED
The `testimonials` INSERT policy only checked `user_id`, not `status` /
`consented_public`, and `authenticated` kept default table INSERT. A direct
PostgREST insert with `status:'live', consented_public:true` landed instantly in
the public `live_testimonials` feed, bypassing moderation (arbitrary copy,
slurs, fake "Level 99 founder" impersonation).

**Fix:** `supabase/migrations/20260722000100_testimonials_insert_hardening.sql`
drops the INSERT policy (the real save path uses the service role and forces
`status='pending'`), revokes client write privileges, and adds a
`display_name <= 60` CHECK.

### 🟠 M1 — `/api/badges/confirm` trusted an unverified `tx_hash` — FIXED
The route flipped a claim to `claimed` with any well-formed hash, with no chain
check — enabling fake "minted" state, broken explorer links, and self-lockout.

**Fix:** `app/api/badges/confirm/route.js` now reads the contract
(`hasClaimed[walletOfRecord][badgeId]`) via viem and only records `claimed` when
the mint is confirmed on-chain against the wallet the voucher was issued to. Also
requires Bearer auth (CSRF, L-3) and validates `token_id` as a uint256 (L-2).

### 🟠 M2 — Voucher signer had no pre-eligibility rate limit — FIXED
Ineligible and first-per-badge requests weren't throttled, allowing DB/signing
amplification from one valid session.

**Fix:** `supabase/functions/sign-badge-voucher/index.ts` calls the existing
`check_rate_limit` RPC (30/min per user) before any eligibility work; fails open
if the limiter is unavailable so it can't lock out legitimate users.

### 🟠 M3 — Revoked testimonials stayed public for ~24h — FIXED
`/api/testimonials/live` was edge-cached `s-maxage=86400`, delaying consent
withdrawal.

**Fix:** cache lowered to `s-maxage=300` in `app/api/testimonials/live/route.js`.

### 🟡 Contract hardening (L-1, L-2) — FIXED
- **L-1:** `approve` / `setApprovalForAll` now `revert Soulbound()` — a
  non-transferable token should not expose live approvals (phishing footgun).
- **L-2:** `claimBadge` uses `_mint` instead of `_safeMint` — the token can
  never move, so the receiver callback bought no safety and could brick claims
  for contract wallets lacking `onERC721Received`; this also leaves `claimBadge`
  with zero external calls.

Contract re-verified: compiles clean (solc 0.8.24 + OZ 5.6.1, cancun) and all
behavioral properties pass in an in-process EVM (11/11, including the new
approve/setApprovalForAll reverts). New Foundry tests added.

### 🟡 Other hardening — FIXED
- `badge_claims` `updated_at` trigger function `search_path` pinned
  (`20260722000200_badge_claims_trigger_search_path.sql`).
- `token_id` format validation on `/api/badges/confirm` (L-2).

## Verified safe (no change needed)

EIP-712 typehash/domain + chain binding; signature malleability & `ecrecover(0)`;
reentrancy ordering; soulbound `_update`; voucher front-running (`to==msg.sender`);
badge SVG/metadata XSS; IDOR on all badge/testimonial routes; `funnel_events` /
`record_funnel_event` / `get_weekly_numbers` RLS & PII posture; service-role key
hygiene; CORS on the edge function.

## Noted, out of scope for this change

- A hardcoded Supabase **anon** JWT in `20260705140000_…sql` (anon keys are
  public by design — low risk; rotate if desired).
- `.env` is git-tracked (placeholder values only today).
- Contract I-4 (ERC-5192 soulbound signalling) and I-6 (mutable metadata vs the
  "permanent" framing) — product/governance decisions, not vulnerabilities.
