import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Manual service-role key verification (pg_cron invokes without JWT)
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey ?? "",
    );

    // Find new users (signed up in last 7 days) who haven't completed key onboarding steps
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: newUsers, error: fetchError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, email, created_at, level, xp, avatar_url")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true })
      .limit(200);

    if (fetchError) {
      throw fetchError;
    }

    if (!newUsers || newUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new users to nurture", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let queued = 0;
    for (const user of newUsers) {
      const daysSinceSignup = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );

      // Determine which nurture step to send based on days since signup
      let title: string;
      let body: string;
      let step: string;

      if (daysSinceSignup === 0 && !user.avatar_url) {
        step = "customize_avatar";
        title = "Make it yours!";
        body = "Customize your avatar to stand out on your quest. It only takes a moment!";
      } else if (daysSinceSignup === 1 && user.level <= 1) {
        step = "first_quest";
        title = "Ready for your first quest?";
        body = "Complete your first habit quest to earn XP and start leveling up!";
      } else if (daysSinceSignup === 3 && user.xp < 100) {
        step = "streak_intro";
        title = "Streaks = bonus XP";
        body = "Did you know? Completing habits on consecutive days builds a streak for bonus XP!";
      } else if (daysSinceSignup === 7 && user.level < 3) {
        step = "weekly_checkin";
        title = "One week in!";
        body = "You've been on your quest for a week. Check in today to keep the momentum going!";
      } else {
        continue;
      }

      // Check if this step was already sent
      const { data: existing } = await supabaseAdmin
        .from("notification_history")
        .select("id")
        .eq("user_id", user.id)
        .eq("notification_type", `onboarding_${step}`)
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      const { error: queueError } = await supabaseAdmin.rpc("queue_notification", {
        p_user_id: user.id,
        p_type: `onboarding_${step}`,
        p_title: title,
        p_body: body,
        p_icon: "/icons/onboarding-star.png",
        p_data: JSON.stringify({ type: "onboarding_nurture", step, days_since_signup: daysSinceSignup }),
      });

      if (!queueError) {
        queued++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Onboarding nurture notifications queued",
        processed: newUsers.length,
        queued,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
