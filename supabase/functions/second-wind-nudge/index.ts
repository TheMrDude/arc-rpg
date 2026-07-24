import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Second Wind recovery nudge ─────────────────────────────────────
// One optional push, ~24h into the 48h recovery window, for users whose
// streak is WOUNDED (exactly one missed day, still recoverable). ZERO
// notifications are sent on RESET (spec §4). Runs hourly via pg_cron;
// dedupes with profiles.second_wind_nudge_sent_at so each window nudges
// at most once. Honors notification prefs + quiet hours via the existing
// queue_notification RPC (streak_reminders pref, type 'streak').
//
// The timezone-aware day math mirrors lib/secondWind.js — it must be
// duplicated here because this runtime (Deno) can't import the app's ESM
// lib. Keep the two in sync if the window/cooldown rules change.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Must match lib/secondWind.js SECOND_WIND_CONFIG.
const WINDOW_HOURS = 48;
const COOLDOWN_DAYS = 7;
const NUDGE_AT_HOURS_REMAINING = 24; // fire when <= this many hours remain

let cachedCronSecret: string | null = null;
async function isAuthorized(req: Request): Promise<boolean> {
  if (req.headers.get("Authorization") === `Bearer ${SERVICE_KEY}`) return true;
  const provided = req.headers.get("x-cron-secret");
  if (!provided) return false;
  let expected = Deno.env.get("CRON_SECRET") || cachedCronSecret;
  if (!expected) {
    const { data } = await supabase.rpc("get_cron_secret");
    expected = typeof data === "string" && data.length > 0 ? data : null;
    cachedCronSecret = expected;
  }
  return !!expected && provided === expected;
}

function dayKeyInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function calendarDayDiff(from: Date, to: Date, timeZone: string): number {
  const a = Date.parse(`${dayKeyInTimeZone(from, timeZone)}T00:00:00Z`);
  const b = Date.parse(`${dayKeyInTimeZone(to, timeZone)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) map[part.type] = part.value;
  const hour = map.hour === "24" ? "00" : map.hour;
  const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +hour, +map.minute, +map.second);
  return asUTC - date.getTime();
}

function startOfDayInTimeZone(dayKey: string, timeZone: string): Date {
  const utcGuess = new Date(`${dayKey}T00:00:00Z`);
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  let result = new Date(utcGuess.getTime() - offset);
  const offset2 = timeZoneOffsetMs(result, timeZone);
  if (offset2 !== offset) result = new Date(utcGuess.getTime() - offset2);
  return result;
}

function recoveryWindowExpiry(lastQuestDate: Date, timeZone: string): Date {
  const lastKey = dayKeyInTimeZone(lastQuestDate, timeZone);
  const firstMissedKey = dayKeyInTimeZone(
    new Date(Date.parse(`${lastKey}T00:00:00Z`) + 86400000),
    "UTC"
  );
  const firstMissedMidnight = startOfDayInTimeZone(firstMissedKey, timeZone);
  return new Date(firstMissedMidnight.getTime() + WINDOW_HOURS * 3600000);
}

function cooldownEligible(lastUsedAt: string | null, now: Date): boolean {
  if (!lastUsedAt) return true;
  return now.getTime() - new Date(lastUsedAt).getTime() >= COOLDOWN_DAYS * 86400000;
}

interface ProfileRow {
  id: string;
  last_quest_date: string | null;
  timezone: string | null;
  current_streak: number | null;
  second_wind_last_used_at: string | null;
  second_wind_nudge_sent_at: string | null;
  streak_state: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const dryRun = payload.dry_run === true;
    const now = new Date();

    // Candidates: anyone whose last completion was 1-2 calendar days ago is
    // potentially WOUNDED. Pull a slightly wider window (by UTC date) and let
    // the tz-aware math decide precisely.
    const since = new Date(now.getTime() - 3 * 86400000).toISOString();
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, last_quest_date, timezone, current_streak, second_wind_last_used_at, second_wind_nudge_sent_at, streak_state"
      )
      .not("last_quest_date", "is", null)
      .gte("last_quest_date", since)
      .limit(500);
    if (error) throw error;

    let nudged = 0;
    let resetReconciled = 0;
    const report: unknown[] = [];

    for (const p of (profiles || []) as ProfileRow[]) {
      const tz = p.timezone || "UTC";
      const last = new Date(p.last_quest_date as string);
      const days = calendarDayDiff(last, now, tz);
      const eligible = cooldownEligible(p.second_wind_last_used_at, now);

      // HEALTHY (active today/yesterday): nothing to do.
      if (days <= 1) continue;

      const expiry = recoveryWindowExpiry(last, tz);
      const remainingMs = expiry.getTime() - now.getTime();
      const withinWindow = remainingMs > 0;

      // WOUNDED and inside the window.
      if (eligible && withinWindow) {
        // Fire once, when <= NUDGE_AT_HOURS_REMAINING remain, and not yet
        // nudged for this window (sent-at must predate the window opening).
        const windowOpenedMs = expiry.getTime() - WINDOW_HOURS * 3600000;
        const alreadyNudged =
          p.second_wind_nudge_sent_at &&
          new Date(p.second_wind_nudge_sent_at).getTime() >= windowOpenedMs;

        if (remainingMs <= NUDGE_AT_HOURS_REMAINING * 3600000 && !alreadyNudged) {
          if (dryRun) {
            report.push({ id: p.id, action: "would_nudge", remaining_ms: remainingMs });
            nudged++;
            continue;
          }
          // Persisted state reconcile + nudge dedupe stamp.
          await supabase
            .from("profiles")
            .update({
              streak_state: "wounded",
              streak_window_expires_at: expiry.toISOString(),
              second_wind_nudge_sent_at: now.toISOString(),
            })
            .eq("id", p.id);

          await supabase.rpc("queue_notification", {
            p_user_id: p.id,
            p_type: "streak",
            p_title: "Your streak's still glowing 🔥",
            p_body: "You've got a Second Wind waiting. One quest today brings it back to full.",
            p_icon: "/icons/icon-192x192.png",
            p_data: { kind: "second_wind", window_expires_at: expiry.toISOString() },
          });
          nudged++;
          report.push({ id: p.id, action: "nudged" });
        }
        continue;
      }

      // RESET (window expired or on cooldown). Reconcile persisted state so
      // the dashboard/cron agree; send NOTHING (spec §4: zero on reset).
      if (p.streak_state !== "reset" || (p.current_streak || 0) !== 0) {
        if (!dryRun) {
          await supabase
            .from("profiles")
            .update({ streak_state: "reset", current_streak: 0, streak_window_expires_at: null })
            .eq("id", p.id);
        }
        resetReconciled++;
        report.push({ id: p.id, action: "reset_reconciled" });
      }
    }

    return new Response(
      JSON.stringify({ dry_run: dryRun, nudged, reset_reconciled: resetReconciled, report }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
