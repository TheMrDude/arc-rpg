# Legendary Badges — Deploy Guide (Milestone Badge NFT layer)

An **optional** layer of soulbound (non-transferable) milestone badges. They are
permanent trophies — never lost, revoked, or expired — claimed by the user to a
wallet they control. The app never holds keys and the server never pays gas.

> The word "NFT" never appears in the user-facing UI. In-app these are
> **Legendary Badges**; the chain is an implementation detail. Everything ships
> **dark** behind `NEXT_PUBLIC_BADGES_ENABLED` until you flip it.

## What's in this layer

| Piece | Location |
| --- | --- |
| ERC-721 contract + Foundry tests + deploy script | `contracts/` (see `contracts/README.md`) |
| `badge_claims` table (new migration) | `supabase/migrations/20260721000000_badge_claims.sql` |
| Voucher-signing Edge Function | `supabase/functions/sign-badge-voucher/` |
| Metadata + image API | `app/api/badges/[badgeId]` and `.../image` |
| Claim-record + status API | `app/api/badges/confirm`, `app/api/badges/status` |
| Gallery + claim flow (wagmi/viem, behind the flag) | `app/badges/` |
| Badge definitions / milestone logic (shared) | `lib/badges.js`, `lib/badge-art.js`, `lib/badge-contract.ts` |

The five v1 badges: **First Light** (7 completions), **Cartographer** (first new
map region), **Bossbreaker** (first boss win), **The Long Road** (100 lifetime
completions), **Worldwalker** (full map). All are lifetime counts or one-time
unlocks — **no streak logic anywhere**.

---

## The important safety points

- **This layer never writes to any existing habit/XP/map table.** It only reads
  milestone data and writes its own `badge_claims` table.
- **Eligibility is re-verified server-side** in the Edge Function against your
  real habit data. The client is never trusted.
- **Deploy scripts are written but NOT run for you.** You run them by hand with
  your own keys. Nothing here touches mainnet on its own.
- Zero cost at rest: metadata lives on `habitquest.dev`, no pinning service, no
  paid RPC tier required.

---

## Prerequisites (do this first)

1. **Create a fresh wallet for the badge signer.** Never reuse a personal
   wallet. Save its private key — it becomes `BADGE_SIGNER_PRIVATE_KEY`. Note its
   public address — it becomes `BADGE_SIGNER` for the deploy.
2. **Fund a separate deployer wallet** with ~$5 of Base Sepolia ETH from a
   faucet (e.g. the Coinbase / Base Sepolia faucet). This wallet's key is
   `PRIVATE_KEY` for the deploy script.

---

## Step 1 — Deploy the contract to Base Sepolia (testnet)

Full commands are in **`contracts/README.md`**. In short:

```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1
forge test -vvv            # everything must be green before you deploy

export PRIVATE_KEY=0x...   # funded deployer
export BADGE_SIGNER=0x...  # signer wallet ADDRESS (public)
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
forge script script/Deploy.s.sol:Deploy --rpc-url base_sepolia --broadcast
```

Copy the deployed contract address from the logs. The script also wires up the
five badge metadata URIs automatically.

## Step 2 — Set env vars

**Vercel** (Project → Settings → Environment Variables):

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS` | deployed address from Step 1 |
| `NEXT_PUBLIC_CHAIN_ID` | `84532` (Base Sepolia) |
| `NEXT_PUBLIC_SITE_URL` | `https://habitquest.dev` (for absolute metadata URLs) |
| `NEXT_PUBLIC_BADGES_ENABLED` | leave `false` for now |

**Supabase** (Edge Function secrets — do NOT put these in Vercel):

```bash
supabase secrets set BADGE_SIGNER_PRIVATE_KEY=0x...   # the fresh signer key
supabase secrets set BADGE_CONTRACT_ADDRESS=0x...     # deployed address
supabase secrets set BADGE_CHAIN_ID=84532
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are already
present for your other functions.

## Step 3 — Apply the migration and deploy the Edge Function

```bash
# Migration (creates badge_claims; touches nothing else)
supabase db push        # or run the SQL in supabase/migrations/20260721000000_badge_claims.sql

# Edge Function (auth is verified inside the function; verify_jwt is off in config.toml)
supabase functions deploy sign-badge-voucher
```

## Step 4 — Turn it on in a PREVIEW deployment only

Set `NEXT_PUBLIC_BADGES_ENABLED=true` for a **Preview** environment (not
Production) and open `/badges`. You should see your earned badges, with locked
silhouettes for the rest.

## Step 5 — Earn a badge and try to break it

1. Earn a milestone on your test account (e.g. complete 7 quests → First Light).
2. Open `/badges`, click **Make it permanent**, connect a browser wallet on Base
   Sepolia, and mint. Confirm it lands in your wallet.
3. Try to break it:
   - **Claim twice** — the second attempt should fail (contract `hasClaimed`
     + `badge_claims` unique row + backend re-check).
   - **Transfer it** — should revert (`Soulbound`).
   - **Use an expired voucher** — vouchers expire after 1 hour; a stale one
     reverts (`VoucherExpired`).

## Step 6 — Base mainnet (only after a clean week on testnet)

Re-run Step 1 against Base mainnet (`--rpc-url base`, `BASE_RPC_URL=https://mainnet.base.org`),
then update the env vars to the mainnet address and `NEXT_PUBLIC_CHAIN_ID=8453`
(both Vercel and the Supabase secrets), redeploy the function, and finally flip
`NEXT_PUBLIC_BADGES_ENABLED=true` in Production.

Ship it quietly — no announcement until a handful of real users have claimed and
the reaction is readable.

---

## Rotating the signer

If the signer key is ever exposed: from the contract **owner** account call
`setSigner(newAddress)`, set the new `BADGE_SIGNER_PRIVATE_KEY` secret, and
redeploy the function. Old vouchers stop working immediately.

## Full env var reference

| Var | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_BADGES_ENABLED` | Vercel | master on/off flag |
| `NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS` | Vercel | contract address for the claim flow |
| `NEXT_PUBLIC_CHAIN_ID` | Vercel | `84532` testnet / `8453` mainnet |
| `NEXT_PUBLIC_SITE_URL` | Vercel | origin for absolute metadata/image URLs |
| `BADGE_SIGNER_PRIVATE_KEY` | Supabase secret | signs mint vouchers (server only) |
| `BADGE_CONTRACT_ADDRESS` | Supabase secret | EIP-712 domain (`verifyingContract`) |
| `BADGE_CHAIN_ID` | Supabase secret | EIP-712 domain `chainId` |
| `PRIVATE_KEY`, `BADGE_SIGNER`, `BASE_SEPOLIA_RPC_URL`, `BASE_RPC_URL` | local shell | deploy only (see `contracts/README.md`) |
