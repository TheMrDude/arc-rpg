import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailPayload {
  email: string;
  name?: string;
  archetype?: string;
  user_id?: string;
}

const ARCHETYPE_OPENERS: Record<string, string> = {
  warrior:
    "You chose the Warrior path — discipline through action. Your first quest is waiting.",
  mage:
    "You chose the Mage path — mastery through knowledge. Your spellbook is open.",
  ranger:
    "You chose the Ranger path — freedom through exploration. The trail starts here.",
  healer:
    "You chose the Healer path — growth through balance. Your journey to wellness begins.",
  rogue:
    "You chose the Rogue path — progress through cleverness. Time to outsmart your old habits.",
};

function buildEmailHtml(name: string, archetype?: string): string {
  const greeting = name ? `Hey ${name}` : "Hey there";
  const archetypeLine = archetype
    ? ARCHETYPE_OPENERS[archetype.toLowerCase()] ||
      `You chose the ${archetype} path. Bold choice.`
    : "Your character is ready. Your story starts now.";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F172A;color:#E2E8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#F59E0B;font-size:28px;margin:0;">⚔️ HabitQuest</h1>
    </div>
    <h2 style="color:#FFFFFF;font-size:22px;margin-bottom:8px;">${greeting},</h2>
    <p style="font-size:16px;line-height:1.6;color:#CBD5E1;">
      Welcome to HabitQuest — where your habits become an adventure.
    </p>
    <p style="font-size:16px;line-height:1.6;color:#CBD5E1;">
      ${archetypeLine}
    </p>
    <h3 style="color:#F59E0B;font-size:18px;margin-top:28px;">Here's your first move:</h3>
    <ol style="font-size:15px;line-height:1.8;color:#CBD5E1;padding-left:20px;">
      <li>Open your <a href="https://habitquest.dev/dashboard" style="color:#00D4FF;text-decoration:none;">dashboard</a></li>
      <li>Create your first quest (just one — keep it tiny)</li>
      <li>Complete it and watch your XP climb</li>
    </ol>
    <p style="font-size:15px;line-height:1.6;color:#94A3B8;margin-top:24px;">
      No streaks. No guilt. Just progress at your pace.
    </p>
    <div style="text-align:center;margin-top:32px;">
      <a href="https://habitquest.dev/dashboard"
         style="display:inline-block;background:#FF6B35;color:#FFFFFF;font-weight:700;font-size:16px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Start Your First Quest →
      </a>
    </div>
    <p style="font-size:13px;color:#64748B;margin-top:40px;text-align:center;">
      Questions? Reply to this email — a real human reads it.<br>
      <a href="https://habitquest.dev" style="color:#64748B;">habitquest.dev</a>
    </p>
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify service-role key for internal calls
    const authHeader = req.headers.get("authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (
      !authHeader ||
      !serviceRoleKey ||
      authHeader !== `Bearer ${serviceRoleKey}`
    ) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: WelcomeEmailPayload = await req.json();
    const { email, name, archetype, user_id } = payload;

    if (!email) {
      return new Response(JSON.stringify({ error: "email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "HabitQuest <dan@habitquest.dev>",
        to: [email],
        subject: "Welcome to HabitQuest — here's your first move",
        html: buildEmailHtml(name || "", archetype),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log to email_log table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    await supabase.from("email_log").insert({
      user_id: user_id || null,
      email_type: "welcome",
      sent_at: new Date().toISOString(),
      metadata: {
        resend_id: resendData.id,
        archetype: archetype || null,
        recipient: email,
      },
    });

    return new Response(
      JSON.stringify({ success: true, resend_id: resendData.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("send-welcome-email error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
