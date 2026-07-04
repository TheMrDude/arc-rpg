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

function buildEmail(archetype: string | null, level: number) {
  const arch = archetype ? archetype.charAt(0).toUpperCase() + archetype.slice(1) : "Hero";
  const subject = "Your character is still waiting at camp (the game got way bigger)";
  const html = `
  <div style="background:#0F172A;color:#fff;padding:32px;font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#FF6B35;margin:0;">⚔️ HabitQuest</h1>
    </div>
    <h2 style="color:#fff;">Hey, it's Dan, the guy building HabitQuest.</h2>
    <p style="color:#E2E8F0;line-height:1.6;">You signed up a while back, and honestly: the version you tried was the tutorial level. Since then I shipped the biggest update yet.</p>
    <div style="background:#1E293B;border:2px solid #FF6B35;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="color:#E2E8F0;margin:0 0 10px;">⚔️ <strong>A full D&D-style campaign layer.</strong> Your daily habits are now your character's downtime actions in an ongoing story.</p>
      <p style="color:#E2E8F0;margin:0 0 10px;">🗺️ <strong>A world map with fog of war.</strong> Regions unlock as you stay consistent.</p>
      <p style="color:#E2E8F0;margin:0 0 10px;">🎲 <strong>Party system and DM dashboard.</strong> Run quests with friends.</p>
      <p style="color:#E2E8F0;margin:0;">✨ <strong>AI narrative that reacts</strong> to what you actually do.</p>
    </div>
    <p style="color:#E2E8F0;line-height:1.6;">Same promise as before: no streaks, no guilt, no punishment for missed days. Your Level ${level} ${arch} has just been waiting at camp.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://habitquest.dev?utm_source=email&utm_medium=reengagement&utm_campaign=campaign_launch" style="display:inline-block;background:#FF6B35;color:#fff;padding:16px 40px;border-radius:10px;font-weight:900;text-decoration:none;font-size:17px;">Return to Your Quest →</a>
    </div>
    <p style="color:#94A3B8;font-size:14px;line-height:1.6;">I'm building this in public as a solo dev. If something feels off, just reply. I read everything and it usually gets fixed the same week.</p>
    <p style="color:#E2E8F0;">See you in there,<br/>Dan</p>
    <p style="color:#94A3B8;font-size:13px;">P.S. Early Bird pricing ($29/yr, half the monthly rate) is still live but won't be forever.</p>
    <div style="text-align:center;border-top:1px solid #334155;padding-top:14px;margin-top:20px;">
      <p style="color:#64748B;font-size:11px;margin:0;">Your habits. Your story. No guilt. | habitquest.dev</p>
    </div>
  </div>`;
  return { subject, html };
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

    const threeDaysAgo = new Date(Date.now() - 3 * 864e5).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, archetype, level, last_quest_date, created_at")
      .or(`last_quest_date.lt.${threeDaysAgo},last_quest_date.is.null`)
      .limit(100);
    if (error) throw error;

    const { data: recent } = await supabase
      .from("email_log")
      .select("user_id")
      .eq("email_type", "re_engagement")
      .gte("sent_at", thirtyDaysAgo);
    const cooldown = new Set((recent || []).map((r: { user_id: string }) => r.user_id));

    let sent = 0;
    const report: unknown[] = [];

    for (const p of profiles || []) {
      if (cooldown.has(p.id)) continue;
      let email = p.email;
      if (!email) {
        const { data: au } = await supabase.auth.admin.getUserById(p.id);
        email = au?.user?.email || null;
      }
      if (!email || BLOCKLIST.includes(email.toLowerCase())) continue;
      if (sent >= 50) break;

      if (dryRun) {
        report.push({ email, level: p.level, archetype: p.archetype });
        sent++;
        continue;
      }

      const { subject, html } = buildEmail(p.archetype, p.level || 1);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html, reply_to: "dan@habitquest.dev" }),
      });
      const data = await res.json();
      if (res.ok) {
        sent++;
        await supabase.from("email_log").insert({ user_id: p.id, email_type: "re_engagement", sent_at: new Date().toISOString(), metadata: { resend_id: data.id } });
        report.push({ email, sent: true });
      } else {
        report.push({ email, sent: false, error: data });
      }
    }

    return new Response(JSON.stringify({ dry_run: dryRun, count: sent, report, ...(dryRun ? { resend_configured: RESEND_KEY.length > 0 } : {}) }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
