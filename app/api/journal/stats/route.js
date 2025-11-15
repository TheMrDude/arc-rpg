import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const FREE_TIER_MONTHLY_LIMIT = 5;

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Journal stats: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Journal stats: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status, journal_entry_count, journal_streak, last_journal_date, longest_journal_streak')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    // Get monthly count for free users
    let monthlyCount = 0;
    if (!isPremium) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      monthlyCount = count || 0;
    }

    // Get mood distribution (last 30 entries)
    const { data: moodData } = await supabaseAdmin
      .from('journal_entries')
      .select('mood')
      .eq('user_id', user.id)
      .not('mood', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    const moodDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalMood = 0;
    let moodCount = 0;

    moodData?.forEach((entry) => {
      if (entry.mood) {
        moodDistribution[entry.mood]++;
        totalMood += entry.mood;
        moodCount++;
      }
    });

    const averageMood = moodCount > 0 ? (totalMood / moodCount).toFixed(2) : null;

    // Get weekly mood trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: weeklyMoods } = await supabaseAdmin
      .from('journal_entries')
      .select('mood, created_at')
      .eq('user_id', user.id)
      .not('mood', 'is', null)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Get equipment count (premium only)
    let equipmentCount = 0;
    if (isPremium) {
      const { count } = await supabaseAdmin
        .from('user_journal_equipment')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      equipmentCount = count || 0;
    }

    // Get boss battles (premium only)
    let bossStats = { available: 0, defeated: 0, in_progress: 0 };
    if (isPremium) {
      const { data: bosses } = await supabaseAdmin
        .from('user_boss_battles')
        .select('status')
        .eq('user_id', user.id);

      bosses?.forEach((boss) => {
        if (boss.status === 'available') bossStats.available++;
        if (boss.status === 'defeated') bossStats.defeated++;
        if (boss.status === 'in_progress') bossStats.in_progress++;
      });
    }

    // Check if user journaled today
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabaseAdmin
      .from('journal_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lte('created_at', today + 'T23:59:59.999Z');

    const journaledToday = (todayCount || 0) > 0;

    const stats = {
      is_premium: isPremium,
      total_entries: profile?.journal_entry_count || 0,
      monthly_entries: monthlyCount,
      monthly_limit: FREE_TIER_MONTHLY_LIMIT,
      remaining_this_month: Math.max(0, FREE_TIER_MONTHLY_LIMIT - monthlyCount),
      streak: profile?.journal_streak || 0,
      longest_streak: profile?.longest_journal_streak || 0,
      last_entry_date: profile?.last_journal_date,
      journaled_today: journaledToday,
      mood_distribution: moodDistribution,
      average_mood: averageMood,
      weekly_moods: weeklyMoods || [],
      equipment_count: equipmentCount,
      boss_stats: bossStats,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Journal stats error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch journal stats' },
      { status: 500 }
    );
  }
}
