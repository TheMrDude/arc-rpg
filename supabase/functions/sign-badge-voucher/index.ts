// sign-badge-voucher
//
// Signed-voucher lazy mint, server side. This function:
//   1. Authenticates the Supabase user from their Bearer token.
//   2. RE-VERIFIES the milestone against the user's actual habit data
//      (never trusts the client) — profiles + weekly_boss_battles + the same
//      world-map unlock logic as lib/world-regions.js.
//   3. Rate-limits per user.
//   4. Signs an EIP-712 MintVoucher with BADGE_SIGNER_PRIVATE_KEY.
//   5. Records/updates the claim in badge_claims (service role).
//
// The signer key never leaves the server; the server never pays gas.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Chain config — must match the deployed contract (see contracts/README.md).
const SIGNER_KEY = Deno.env.get("BADGE_SIGNER_PRIVATE_KEY") ?? "";
const CONTRACT_ADDRESS = Deno.env.get("BADGE_CONTRACT_ADDRESS") ?? "";
const CHAIN_ID = Number(Deno.env.get("BADGE_CHAIN_ID") ?? "84532"); // default: Base Sepolia

const VOUCHER_TTL_SECONDS = 60 * 60; // 1 hour
const RATE_LIMIT_WINDOW_SECONDS = 10; // min seconds between re-signs for the same badge
const TOTAL_REGIONS = 7; // keep in sync with lib/world-regions.js

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

/** World-map region unlock rules, mirrored from lib/world-regions.js. */
const REGIONS: { id: string; key: string }[] = [
  { id: "aeloria_plains", key: "always" },
  { id: "thornback_forest", key: "checkins_1" },
  { id: "ember_coast", key: "checkins_10" },
  { id: "ashfall_peaks", key: "streak_14" },
  { id: "dusk_marshes", key: "checkins_21" },
  { id: "sunken_city", key: "level_20" },
  { id: "deepstone_mines", key: "level_30" },
];

function regionUnlocked(
  key: string,
  id: string,
  d: { checkins: number; longestStreak: number; level: number; traveled: string[] },
): boolean {
  if (key === "always") return true;
  if (d.traveled.includes(id)) return true;
  switch (key) {
    case "checkins_1":
      return d.checkins >= 1;
    case "checkins_10":
      return d.checkins >= 10;
    case "streak_14":
      return d.longestStreak >= 14;
    case "checkins_21":
      return d.checkins >= 21;
    case "level_20":
      return d.level >= 20;
    case "level_30":
      return d.level >= 30;
    default:
      return false;
  }
}

/** Re-verify a milestone from source data. Returns true if genuinely earned. */
async function isEarned(userId: string, badgeId: number): Promise<boolean> {
  const { data: profile } = await admin
    .from("profiles")
    .select("quests_completed, longest_streak, level, story_progress")
    .eq("id", userId)
    .single();

  if (!profile) return false;

  const quests = profile.quests_completed || 0;
  const longestStreak = profile.longest_streak || 0;
  const level = profile.level || 1;
  const traveled: string[] = profile.story_progress?.regions_traveled || [];

  const regionData = { checkins: quests, longestStreak, level, traveled };
  const unlockedRegions = REGIONS.filter((r) => regionUnlocked(r.key, r.id, regionData)).length;

  switch (badgeId) {
    case 1:
      return quests >= 7;
    case 2:
      return unlockedRegions > 1; // first region beyond the starter zone
    case 3: {
      const { count } = await admin
        .from("weekly_boss_battles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "defeated");
      return (count || 0) > 0;
    }
    case 4:
      return quests >= 100;
    case 5:
      return unlockedRegions >= TOTAL_REGIONS;
    default:
      return false;
  }
}

/** Random uint256 nonce as a decimal string. */
function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!SIGNER_KEY || !CONTRACT_ADDRESS) {
    return json({ error: "Badge signing is not configured" }, 503);
  }

  // 1. Authenticate the user from their Bearer token (anon client verifies JWT).
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Unauthorized" }, 401);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  // 2. Validate input.
  let body: { badge_id?: unknown; wallet_address?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const badgeId = Number(body.badge_id);
  if (!Number.isInteger(badgeId) || badgeId < 1 || badgeId > 5) {
    return json({ error: "Invalid badge_id" }, 400);
  }

  const wallet = String(body.wallet_address || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return json({ error: "Invalid wallet_address" }, 400);
  }

  // 3. Look up any existing claim record (double-claim + rate-limit guard).
  const { data: existing } = await admin
    .from("badge_claims")
    .select("id, status, updated_at")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();

  if (existing?.status === "claimed") {
    return json({ error: "Badge already claimed", code: "already_claimed" }, 409);
  }

  if (existing?.updated_at) {
    const ageMs = Date.now() - new Date(existing.updated_at).getTime();
    if (ageMs < RATE_LIMIT_WINDOW_SECONDS * 1000) {
      return json({ error: "Please wait a moment and try again", code: "rate_limited" }, 429);
    }
  }

  // 4. Re-verify eligibility from source data. Never trust the client.
  if (!(await isEarned(userId, badgeId))) {
    return json({ error: "Milestone not yet earned", code: "not_eligible" }, 403);
  }

  // 5. Sign the EIP-712 voucher.
  const nonce = randomNonce();
  const expiry = Math.floor(Date.now() / 1000) + VOUCHER_TTL_SECONDS;

  const key = (SIGNER_KEY.startsWith("0x") ? SIGNER_KEY : `0x${SIGNER_KEY}`) as `0x${string}`;
  let account;
  try {
    account = privateKeyToAccount(key);
  } catch {
    return json({ error: "Signer key misconfigured" }, 500);
  }

  const voucher = {
    to: wallet as `0x${string}`,
    badgeId: BigInt(badgeId),
    nonce: BigInt(nonce),
    expiry: BigInt(expiry),
  };

  const signature = await account.signTypedData({
    domain: {
      name: "HabitQuestBadges",
      version: "1",
      chainId: CHAIN_ID,
      verifyingContract: CONTRACT_ADDRESS as `0x${string}`,
    },
    types: {
      MintVoucher: [
        { name: "to", type: "address" },
        { name: "badgeId", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    },
    primaryType: "MintVoucher",
    message: voucher,
  });

  // 6. Record/refresh the claim (service role bypasses RLS).
  const { error: upsertErr } = await admin.from("badge_claims").upsert(
    {
      user_id: userId,
      badge_id: badgeId,
      wallet_address: wallet,
      nonce,
      chain_id: CHAIN_ID,
      contract_address: CONTRACT_ADDRESS,
      status: "voucher_issued",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,badge_id" },
  );

  if (upsertErr) {
    console.error("badge_claims upsert failed:", upsertErr);
    return json({ error: "Could not record claim" }, 500);
  }

  // 7. Return the voucher + signature for on-chain submission.
  return json({
    voucher: {
      to: voucher.to,
      badgeId: badgeId,
      nonce: nonce,
      expiry: expiry,
    },
    signature,
    contract_address: CONTRACT_ADDRESS,
    chain_id: CHAIN_ID,
  });
});
