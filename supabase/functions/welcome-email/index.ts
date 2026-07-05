import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "HabitQuest <hello@habitquest.dev>";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Invoked by the notify_welcome_email() trigger on auth.users, which sends the
// Vault secret 'edge_cron_secret' in x-cron-secret. CRON_SECRET env var wins;
// otherwise the secret is fetched via the service-role-only get_cron_secret() RPC.
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

const ARCHETYPE_CONTENT: Record<string, { emoji: string; title: string; flavor: string; firstQuest: string }> = {
  warrior: {
    emoji: "⚔️",
    title: "The Warrior's Path Begins",
    flavor: "You chose strength and discipline. Every habit is a battle — and Warriors don't back down.",
    firstQuest: "Your first quest awaits: pick ONE habit you've been avoiding and crush it today. No overthinking. Just action.",
  },
  seeker: {
    emoji: "🔮",
    title: "The Seeker's Journey Begins",
    flavor: "You chose curiosity and growth. Every habit is a discovery — and Seekers never stop exploring.",
    firstQuest: "Your first quest awaits: try something new today. A 5-minute meditation, a page of a book, a walk in a new direction.",
  },
  builder: {
    emoji: "🏗️",
    title: "The Builder's Foundation",
    flavor: "You chose creation and progress. Every habit is a brick — and Builders construct empires one brick at a time.",
    firstQuest: "Your first quest awaits: set up your first 3 habits in HabitQuest. Keep them small. Builders know big things start tiny.",
  },
  shadow: {
    emoji: "🌑",
    title: "The Shadow Awakens",
    flavor: "You chose strategy and depth. Every habit is a calculated move — and Shadows strike with precision.",
    firstQuest: "Your first quest awaits: identify the ONE habit that would create the biggest ripple effect in your life. Then do it.",
  },
  sage: {
    emoji: "📚",
    title: "The Sage's First Lesson",
    flavor: "You chose wisdom and balance. Every habit is a teaching — and Sages know that mastery comes from consistency, not intensity.",
    firstQuest: "Your first quest awaits: reflect on what habit would bring the most balance to your day. Then take the first step.",
  },
};

function buildWelcomeEmail(archetype: string | null, email: string): { subject: string; html: string } {
  const arch = archetype && ARCHETYPE_CONTENT[archetype] ? archetype : null;
  const content = arch ? ARCHETYPE_CONTENT[arch] : null;

  const subject = content
    ? `${content.emoji} ${content.title} — Welcome to HabitQuest`
    : "⚔️ Welcome to HabitQuest — Your Adventure Begins";

  const archetypeSection = content
    ? `
      <div style="background:#1E293B;border:2px solid #FF6B35;border-radius:12px;padding:24px;margin:20px 0;">
        <h2 style="color:#FF6B35;margin:0 0 12px;font-size:22px;">${content.emoji} ${content.title}</h2>
        <p style="color:#E2E8F0;margin:0 0 16px;font-size:16px;line-height:1.6;">${content.flavor}</p>
        <div style="background:#0F3460;border-radius:8px;padding:16px;border-left:4px solid #F59E0B;">
          <p style="color:#FCD34D;margin:0;font-weight:700;font-size:15px;">🎯 ${content.firstQuest}</p>
        </div>
      </div>
    `
    : `
      <div style="background:#1E293B;border:2px solid #FF6B35;border-radius:12px;padding:24px;margin:20px 0;">
        <h2 style="color:#FF6B35;margin:0 0 12px;">Your Adventure Begins Now</h2>
        <p style="color:#E2E8F0;margin:0;font-size:16px;line-height:1.6;">First step: choose your archetype. Are you a Warrior, Seeker, Builder, Shadow, or Sage? Your path shapes your entire quest experience.</p>
      </div>
    `;

  const html = `
    <div style="background:#0F172A;color:#fff;padding:32px;font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;border-radius:16px;">
      <div style="text-align:center;padding:24px 0;border-bottom:2px solid #1E293B;margin-bottom:24px;">
        <h1 style="color:#FF6B35;margin:0;font-size:28px;">⚔️ HabitQuest</h1>
        <p style="color:#94A3B8;margin:8px 0 0;font-size:14px;">Build Habits You Actually Keep</p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#fff;margin:0 0 8px;font-size:24px;">Welcome, Hero.</h2>
        <p style="color:#94A3B8;margin:0;font-size:16px;">You just took the hardest step — showing up.</p>
      </div>
      ${archetypeSection}
      <div style="background:#1E293B;border-radius:12px;padding:24px;margin:20px 0;">
        <h3 style="color:#00D4FF;margin:0 0 16px;font-size:18px;">📋 Your 7-Day Welcome Quest</h3>
        <p style="color:#94A3B8;margin:0 0 12px;font-size:14px;">We've set up a starter quest chain to get you rolling:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr style="border-bottom:1px solid #334155;"><td style="padding:8px;color:#F59E0B;font-weight:700;font-size:13px;">Day 1</td><td style="padding:8px;color:#E2E8F0;font-size:13px;">Complete your first quest</td><td style="padding:8px;color:#10B981;font-size:13px;text-align:right;">+50 gold</td></tr>
          <tr style="border-bottom:1px solid #334155;"><td style="padding:8px;color:#F59E0B;font-weight:700;font-size:13px;">Day 3</td><td style="padding:8px;color:#E2E8F0;font-size:13px;">Hit a 3-day streak</td><td style="padding:8px;color:#10B981;font-size:13px;text-align:right;">+100 gold</td></tr>
          <tr style="border-bottom:1px solid #334155;"><td style="padding:8px;color:#F59E0B;font-weight:700;font-size:13px;">Day 5</td><td style="padding:8px;color:#E2E8F0;font-size:13px;">Beat a Hard quest</td><td style="padding:8px;color:#10B981;font-size:13px;text-align:right;">+150 gold</td></tr>
          <tr><td style="padding:8px;color:#F59E0B;font-weight:700;font-size:13px;">Day 7</td><td style="padding:8px;color:#E2E8F0;font-size:13px;">7-day streak — Hero Established 🏆</td><td style="padding:8px;color:#10B981;font-size:13px;text-align:right;">+250 gold</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="https://habitquest.dev?utm_source=email&utm_medium=welcome&utm_campaign=signup" style="display:inline-block;background:#FF6B35;color:#fff;padding:16px 40px;border-radius:10px;font-weight:900;text-decoration:none;font-size:18px;letter-spacing:0.5px;">Open Your Quest Log →</a>
      </div>
      <div style="background:#1E293B;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
        <p style="color:#94A3B8;margin:0 0 8px;font-size:14px;">Built by a real human, building in public</p>
        <p style="color:#00D4FF;margin:0;font-weight:700;">Follow the journey → <a href="https://substack.com/@officialmrdude" style="color:#00D4FF;">@OfficialMrDude on Substack</a></p>
      </div>
      <div style="text-align:center;border-top:1px solid #334155;padding-top:16px;margin-top:24px;">
        <p style="color:#64748B;font-size:11px;margin:0;">You're getting this because you signed up at habitquest.dev</p>
        <p style="color:#64748B;font-size:11px;margin:4px 0 0;">Your habits. Your story. No guilt.</p>
      </div>
    </div>
  `;

  return { subject, html };
}

Deno.serve(async (req: Request) => {
  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  try {
    const payload = await req.json();
    const record = payload.record || payload;
    const userId = record.id;
    const email = record.email;
    const testMode = payload.test_mode === true;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!RESEND_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    let archetype: string | null = null;
    if (userId && !testMode) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("archetype")
        .eq("id", userId)
        .single();
      archetype = profile?.archetype || null;
    } else {
      archetype = record.archetype || null;
    }

    const { subject, html } = buildWelcomeEmail(archetype, email);

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject,
        html,
        reply_to: "dan@habitquest.dev",
      }),
    });

    const resendData = await resendRes.json();
    const emailSent = resendRes.ok;

    // Log the email
    if (emailSent && userId) {
      await supabase.from("email_log").insert({
        user_id: userId,
        email_type: "welcome",
        sent_at: new Date().toISOString(),
        metadata: { archetype, resend_id: resendData.id },
      }).then(() => {});
    }

    // Auto-enroll in Welcome Quest if real user
    if (userId && !testMode) {
      await supabase.from("user_quest_chain_progress").upsert({
        id: crypto.randomUUID(),
        user_id: userId,
        chain_id: "welcome_quest",
        current_step: 1,
        status: "active",
        started_at: new Date().toISOString(),
      }, { onConflict: "user_id,chain_id" }).then(() => {});
    }

    return new Response(
      JSON.stringify({
        success: emailSent,
        email_sent: emailSent,
        resend_response: resendData,
        archetype,
        enrolled_in_welcome_quest: !testMode && !!userId,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
