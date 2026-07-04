import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, max-age=300",
};

function anonymize(email: string | null, index: number): string {
  if (!email) return `Quester #${index + 1}`;
  const local = email.split("@")[0];
  if (local.length <= 2) return local[0] + "***";
  return local[0] + local[1] + "***" + local[local.length - 1];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Aggregate stats
    const { data: stats } = await supabase.rpc("get_leaderboard_stats").single();

    // Top 10 by XP
    const { data: topXp } = await supabase
      .from("profiles")
      .select("email, level, xp, archetype, current_streak, longest_streak, quests_completed")
      .order("xp", { ascending: false })
      .limit(10);

    // Top 10 by longest streak
    const { data: topStreaks } = await supabase
      .from("profiles")
      .select("email, level, xp, archetype, current_streak, longest_streak, quests_completed")
      .order("longest_streak", { ascending: false })
      .limit(10);

    // Top 10 by quests completed
    const { data: topQuests } = await supabase
      .from("profiles")
      .select("email, level, xp, archetype, quests_completed")
      .order("quests_completed", { ascending: false })
      .limit(10);

    const anonymizeList = (list: any[] | null) =>
      (list ?? []).map((p, i) => ({
        name: anonymize(p.email, i),
        level: p.level ?? 1,
        xp: p.xp ?? 0,
        archetype: p.archetype ?? "Warrior",
        current_streak: p.current_streak ?? 0,
        longest_streak: p.longest_streak ?? 0,
        quests_completed: p.quests_completed ?? 0,
      }));

    const payload = {
      generated_at: new Date().toISOString(),
      stats: stats ?? {
        total_questers: 0,
        total_quests_completed: 0,
        longest_streak_ever: 0,
        total_xp_earned: 0,
      },
      leaderboards: {
        top_xp: anonymizeList(topXp),
        top_streaks: anonymizeList(topStreaks),
        top_quests: anonymizeList(topQuests),
      },
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
