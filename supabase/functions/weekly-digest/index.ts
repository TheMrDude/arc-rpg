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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret" } });
  }

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  if (!RESEND_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Only users active in the last 14 days get a digest. Dormant users are handled by re-engagement.
    const fourteenDaysAgo = new Date(Date.now() - 14 * 864e5).toISOString().split("T")[0];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .not("archetype", "is", null)
      .gte("last_quest_date", fourteenDaysAgo);

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No recently active users", sent: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekStart = oneWeekAgo.toISOString();

    let emailsSent = 0;
    const results: any[] = [];

    for (const profile of profiles) {
      let email = profile.email;
      if (!email) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
        email = authUser?.user?.email || null;
      }
      if (!email || BLOCKLIST.includes(email.toLowerCase())) continue;

      const { count: questCount } = await supabase
        .from("quests")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("completed", true)
        .gte("completed_at", weekStart);

      const { data: goldTxns } = await supabase
        .from("gold_transactions")
        .select("amount")
        .eq("user_id", profile.id)
        .gt("amount", 0)
        .gte("created_at", weekStart);

      const goldEarned = goldTxns?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
      const questsThisWeek = questCount || 0;
      const archetype = profile.archetype || "Hero";
      const archetypeTitle = archetype.charAt(0).toUpperCase() + archetype.slice(1);
      const streakEmoji = profile.current_streak >= 7 ? "🔥" : profile.current_streak >= 3 ? "⚡" : "✨";

      const subject = `${streakEmoji} Your Weekly Quest Log - Level ${profile.level} ${archetypeTitle}`;
      const html = `
        <div style="background:#0F172A;color:#fff;padding:32px;font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#FF6B35;margin:0;">⚔️ HabitQuest</h1>
            <p style="color:#94A3B8;margin:4px 0;">Your Weekly Quest Log</p>
          </div>
          <div style="background:#1E293B;border:2px solid #00D4FF;border-radius:12px;padding:24px;margin-bottom:16px;">
            <h2 style="color:#00D4FF;margin:0 0 16px;">${streakEmoji} ${archetypeTitle} - Level ${profile.level}</h2>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
              <div style="background:#0F3460;border-radius:8px;padding:12px 16px;flex:1;min-width:100px;text-align:center;">
                <div style="color:#F59E0B;font-size:24px;font-weight:900;">${questsThisWeek}</div>
                <div style="color:#94A3B8;font-size:12px;">Quests This Week</div>
              </div>
              <div style="background:#0F3460;border-radius:8px;padding:12px 16px;flex:1;min-width:100px;text-align:center;">
                <div style="color:#F59E0B;font-size:24px;font-weight:900;">${goldEarned}</div>
                <div style="color:#94A3B8;font-size:12px;">Gold Earned</div>
              </div>
              <div style="background:#0F3460;border-radius:8px;padding:12px 16px;flex:1;min-width:100px;text-align:center;">
                <div style="color:#F59E0B;font-size:24px;font-weight:900;">${profile.current_streak} day${profile.current_streak !== 1 ? 's' : ''}</div>
                <div style="color:#94A3B8;font-size:12px;">Current Streak</div>
              </div>
            </div>
          </div>
          ${questsThisWeek === 0 ? `
            <div style="background:#1E293B;border:2px solid #FF6B35;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="color:#FF6B35;font-weight:700;margin:0 0 8px;">Your quest log is empty this week!</p>
              <p style="color:#94A3B8;margin:0;">No shame - just a fresh start. One quest today changes everything.</p>
            </div>
          ` : `
            <div style="background:#1E293B;border:2px solid #10B981;border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;">
              <p style="color:#10B981;font-weight:700;margin:0;">Keep going, ${archetypeTitle}! You're building momentum. 💪</p>
            </div>
          `}
          <div style="text-align:center;margin-top:24px;">
            <a href="https://habitquest.dev?utm_source=email&utm_medium=digest&utm_campaign=weekly" style="display:inline-block;background:#FF6B35;color:#fff;padding:14px 32px;border-radius:8px;font-weight:900;text-decoration:none;font-size:16px;">Open Your Quest Log →</a>
          </div>
          <div style="text-align:center;margin-top:24px;border-top:1px solid #334155;padding-top:16px;">
            <p style="color:#64748B;font-size:12px;margin:0;">Built by <a href="https://substack.com/@officialmrdude" style="color:#00D4FF;">@OfficialMrDude</a> | <a href="https://habitquest.dev" style="color:#00D4FF;">habitquest.dev</a></p>
          </div>
        </div>
      `;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: [email], subject, html, reply_to: "dan@habitquest.dev" }),
      });

      const resendData = await resendRes.json();
      if (resendRes.ok) {
        emailsSent++;
        await supabase.from("email_log").insert({ user_id: profile.id, email_type: "weekly_digest", sent_at: new Date().toISOString(), metadata: { resend_id: resendData.id } });
      }
      results.push({ email: email.substring(0, 3) + "...", sent: resendRes.ok });

      await supabase.from("weekly_summaries").insert({
        user_id: profile.id,
        week_start_date: weekStart.split("T")[0],
        week_end_date: new Date().toISOString().split("T")[0],
        summary_type: "weekly_digest",
        summary_text: JSON.stringify({ quests_completed: questsThisWeek, gold_earned: goldEarned, current_streak: profile.current_streak, level: profile.level }),
      });
    }

    return new Response(JSON.stringify({ message: `Digest sent to ${emailsSent} users`, sent: emailsSent, results }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
