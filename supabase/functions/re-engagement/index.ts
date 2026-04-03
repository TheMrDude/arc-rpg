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

    // Find users inactive for 3+ days who haven't been contacted in the last 7 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: inactiveUsers, error: fetchError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, display_name, email, last_active_at, level, xp")
      .lt("last_active_at", threeDaysAgo.toISOString())
      .order("last_active_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      throw fetchError;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No inactive users to re-engage", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Filter out users already contacted recently
    const { data: recentlyContacted } = await supabaseAdmin
      .from("notification_history")
      .select("user_id")
      .eq("notification_type", "re_engagement")
      .gte("sent_at", sevenDaysAgo.toISOString());

    const recentlyContactedIds = new Set(
      (recentlyContacted || []).map((r: { user_id: string }) => r.user_id),
    );

    const usersToContact = inactiveUsers.filter(
      (u: { id: string }) => !recentlyContactedIds.has(u.id),
    );

    let queued = 0;
    for (const user of usersToContact) {
      const daysInactive = Math.floor(
        (Date.now() - new Date(user.last_active_at).getTime()) / (1000 * 60 * 60 * 24),
      );

      const { error: queueError } = await supabaseAdmin.rpc("queue_notification", {
        p_user_id: user.id,
        p_type: "re_engagement",
        p_title: "Your quest awaits!",
        p_body: `You've been away for ${daysInactive} days. Your Level ${user.level} character misses you!`,
        p_icon: "/icons/quest-bell.png",
        p_data: JSON.stringify({ type: "re_engagement", days_inactive: daysInactive }),
      });

      if (!queueError) {
        queued++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Re-engagement notifications queued",
        processed: usersToContact.length,
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
