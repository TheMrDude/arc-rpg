# HabitQuest Legendary Badges — Contracts

Soulbound (non-transferable) ERC-721 badges that commemorate real HabitQuest
milestones. Built with [Foundry](https://book.getfoundry.sh/), OpenZeppelin 5.x,
Solidity `^0.8.24`, targeting **Base** (Base Sepolia first, then Base mainnet).

The app never holds user keys and the server never pays gas: the HabitQuest
backend signs an [EIP-712](https://eips.ethereum.org/EIPS/eip-712) mint voucher
after re-verifying a milestone, and the user submits it with `claimBadge`,
paying their own (tiny, L2) gas.

## What the contract guarantees

- **Soulbound.** Any owner→owner transfer reverts (`Soulbound`). Mints and
  owner-initiated burns are allowed. No app, company, or outage can move or
  revoke a badge.
- **Voucher-gated mint.** `claimBadge(voucher, signature)` only mints if the
  voucher was signed by the current `signer` and is submitted by `voucher.to`.
- **Replay-proof.** Each voucher's `(to, badgeId, nonce)` can be used once
  (`voucherUsed`).
- **One badge per wallet.** A wallet can hold at most one of each `badgeId`
  (`hasClaimed`), even with a fresh voucher — this is the on-chain double-claim
  guard that complements the backend's `badge_claims` table.
- **User sovereignty.** The token owner (and only the owner) may `burn` their
  badge.

## Layout

```
contracts/
  src/HabitQuestBadges.sol      # the contract
  test/HabitQuestBadges.t.sol   # full Foundry test suite
  script/Deploy.s.sol           # deploy + wire up the 5 v1 badge URIs (NOT run in CI)
  foundry.toml                  # solc 0.8.24, evm_version = cancun
  remappings.txt
```

> **EVM version:** `cancun`. OpenZeppelin 5.6 uses the `mcopy` opcode; Base
> supports Cancun. This is set in `foundry.toml`.

## Install & test (Dan runs this)

Foundry pulls its dependencies with git submodules:

```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1
forge build
forge test -vvv
```

The suite covers the required security properties:

| Test | Property |
| --- | --- |
| `test_RevertWhen_VoucherReplayed` | voucher replay rejection |
| `test_RevertWhen_BadgeClaimedTwiceWithNewVoucher` | double-claim rejection |
| `test_RevertWhen_SignedByWrongKey` | wrong-signer rejection |
| `test_RevertWhen_TransferAttempted` / `test_RevertWhen_SafeTransferAttempted` | soulbound transfer revert |
| `test_OwnerCanBurnTheirBadge` / `test_RevertWhen_NonOwnerBurns` | owner-only burn |
| `test_RevertWhen_VoucherExpired` / `test_RevertWhen_WrongRecipientSubmits` / `test_RevertWhen_BadgeNotConfigured` | voucher hygiene |
| `test_SignerRotation_*` | signer rotation |

> Compilation and all behavioral properties were also verified against
> `solc 0.8.24` + `@openzeppelin/contracts@5.6.1` in an in-process EVM during
> development. `forge test` is the source of truth before any deploy.

## Deploy (testnet first — Dan runs this manually with his own keys)

**Never run these in CI.** They are written to be run by hand.

Env the scripts read:

| Var | Meaning |
| --- | --- |
| `PRIVATE_KEY` | deployer key (funded with Base ETH); also the owner unless `BADGE_OWNER` is set |
| `BADGE_SIGNER` | backend signer **address** (the public address for `BADGE_SIGNER_PRIVATE_KEY` in Supabase) |
| `BADGE_OWNER` | (optional) admin/owner address; defaults to the deployer |
| `METADATA_BASE_URI` | (optional) defaults to `https://habitquest.dev/api/badges` |
| `BASE_SEPOLIA_RPC_URL` / `BASE_RPC_URL` | RPC endpoints |
| `BASESCAN_API_KEY` | (optional) for `--verify` |

### Base Sepolia (testnet)

```bash
cd contracts
export PRIVATE_KEY=0x...            # deployer (fund with ~\$5 Base Sepolia ETH from a faucet)
export BADGE_SIGNER=0x...           # signer wallet ADDRESS (fresh wallet, not personal)
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

forge script script/Deploy.s.sol:Deploy \
  --rpc-url base_sepolia \
  --broadcast \
  --verify --etherscan-api-key "$BASESCAN_API_KEY"   # --verify optional
```

Note the deployed address from the logs. Set it as `NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS`
(Vercel) and `NEXT_PUBLIC_CHAIN_ID=84532`.

### Base mainnet (only after a clean week on testnet)

```bash
cd contracts
export PRIVATE_KEY=0x...
export BADGE_SIGNER=0x...
export BASE_RPC_URL=https://mainnet.base.org

forge script script/Deploy.s.sol:Deploy \
  --rpc-url base \
  --broadcast \
  --verify --etherscan-api-key "$BASESCAN_API_KEY"
```

Then `NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS=<mainnet address>` and
`NEXT_PUBLIC_CHAIN_ID=8453`.

The deploy script also calls `setBadgeURI(1..5, …)` so metadata resolves
immediately. If you add badges later, call `setBadgeURI` again (owner only).

## Rotating the signer

If the signer key is ever exposed, from the owner account call
`setSigner(newAddress)`. Old vouchers stop working immediately; issue new ones
from the new `BADGE_SIGNER_PRIVATE_KEY`.
