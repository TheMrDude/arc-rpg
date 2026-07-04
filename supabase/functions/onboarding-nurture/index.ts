import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "HabitQuest <hello@habitquest.dev>";
const BLOCKLIST = ["qwe@qwe.com", "pwnrglfnnlynptfsyi@fxavaj.com", "jimmytesting123@gmail.com"];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Cron auth: CRON_SECRET env var wins; otherwise the Vault secret
// 'edge_cron_secret' is fetched via the service-role-only get_cron_secret() RPC.
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

function wrap(inner: string): string {
  return `<div style="background:#0F172A;color:#fff;padding:32px;font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
    <div style="text-align:center;margin-bottom:20px;"><h1 style="color:#FF6B35;margin:0;">⚔️ HabitQuest</h1></div>
    ${inner}
    <div style="text-align:center;border-top:1px solid #334155;padding-top:14px;margin-top:20px;">
      <p style="color:#64748B;font-size:11px;margin:0;">Your habits. Your story. No guilt. | habitquest.dev</p>
    </div></div>`;
}

const CTA = (label: string, utm: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="https://habitquest.dev?utm_source=email&utm_medium=nurture&utm_campaign=${utm}" style="display:inline-block;background:#FF6B35;color:#fff;padding:14px 36px;border-radius:10px;font-weight:900;text-decoration:none;font-size:16px;">${label}</a></div>`;

function buildStep(step: string): { subject: string; html: string } {
  if (step === "day1") {
    return {
      subject: "Your first quest is the whole game",
      html: wrap(`<h2 style=\"color:#fff;\">One quest. That's it.</h2>
        <p style=\"color:#E2E8F0;line-height:1.6;\">Most habit apps fail because day one feels like homework. Here, day one is simple: add one real habit and complete it. Our AI turns it into a quest, you get XP and gold, and your character's story starts moving.</p>
        <p style=\"color:#E2E8F0;line-height:1.6;\">Don't build the perfect system today. Just win once.</p>
        ${CTA("Complete Your First Quest →", "day1")}`),
    };
  }
  if (step === "day3") {
    return {
      subject: "Day 3 is where most people quit (not you)",
      html: wrap(`<h2 style=\"color:#fff;\">The novelty wore off. Good.</h2>
        <p style=\"color:#E2E8F0;line-height:1.6;\">Day 3 is where motivation dips and systems take over. That's exactly what HabitQuest is built for: no broken streaks, no guilt, just the next quest.</p>
        <p style=\"color:#E2E8F0;line-height:1.6;\">Log in, run one quest, and watch your world map open up. Consistency unlocks regions. Literally.</p>
        ${CTA("Run Today's Quest →", "day3")}`),
    };
  }
  return {
    subject: "One week in: here's what Pro unlocks (Early Bird ends soon)",
    html: wrap(`<h2 style=\"color:#fff;\">You made it a week. Most don't.</h2>
      <p style=\"color:#E2E8F0;line-height:1.6;\">If HabitQuest is working for you, Pro is where it gets fun: unlimited habits, boss battles, quest chains, the equipment shop, and the full D&D campaign layer with party play.</p>
      <div style=\"background:#1E293B;border:2px solid #F59E0B;border-radius:12px;padding:18px;margin:16px 0;text-align:center;\">
        <p style=\"color:#FCD34D;font-weight:900;font-size:18px;margin:0;\">Early Bird: $29/yr</p>
        <p style=\"color:#94A3B8;margin:6px 0 0;font-size:13px;\">That's $2.42/mo, locked in at launch pricing. It goes away when we hit our first user milestone.</p>
      </div>
      ${CTA("Lock In Early Bird →", "day7_upgrade")}
      <p style=\"color:#94A3B8;font-size:13px;\">Not ready? All good. The free tier is free forever. No guilt, remember?</p>`),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const dryRun = payload.dry_run === true;

    if (!dryRun && !RESEND_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    const eightDaysAgo = new Date(Date.now() - 8 * 864e5).toISOString();
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, archetype, level, xp, is_premium, quests_completed, created_at")
      .gte("created_at", eightDaysAgo)
      .limit(200);
    if (error) throw error;

    let sent = 0;
    const report: unknown[] = [];

    for (const u of users || []) {
      const days = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 864e5);
      let step: string | null = null;
      if (days === 1 && (u.quests_completed || 0) === 0) step = "day1";
      else if (days === 3 && (u.xp || 0) < 100) step = "day3";
      else if (days === 7 && !u.is_premium) step = "day7";
      if (!step) continue;

      const emailType = `onboarding_${step}`;
      const { data: already } = await supabase
        .from("email_log")
        .select("id")
        .eq("user_id", u.id)
        .eq("email_type", emailType)
        .limit(1);
      if (already && already.length > 0) continue;

      let email = u.email;
      if (!email) {
        const { data: au } = await supabase.auth.admin.getUserById(u.id);
        email = au?.user?.email || null;
      }
      if (!email || BLOCKLIST.includes(email.toLowerCase())) continue;

      if (dryRun) {
        report.push({ email, step });
        sent++;
        continue;
      }

      const { subject, html } = buildStep(step);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html, reply_to: "dan@habitquest.dev" }),
      });
      const data = await res.json();
      if (res.ok) {
        sent++;
        await supabase.from("email_log").insert({ user_id: u.id, email_type: emailType, sent_at: new Date().toISOString(), metadata: { resend_id: data.id, step } });
        report.push({ email, step, sent: true });
      } else {
        report.push({ email, step, sent: false, error: data });
      }
    }

    return new Response(JSON.stringify({ dry_run: dryRun, count: sent, report, ...(dryRun ? { resend_configured: RESEND_KEY.length > 0 } : {}) }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
