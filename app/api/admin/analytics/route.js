import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get analytics dashboard data
export async function GET(request) {
  try {
    // Authenticate and verify admin
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'overview';
    const days = parseInt(searchParams.get('days') || '30');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let data = {};

    if (metric === 'overview' || metric === 'all') {
      // Get high-level overview metrics
      const [dau, revenue, engagement, funnel] = await Promise.all([
        supabaseAdmin.from('analytics_daily_active_users').select('*').limit(days),
        supabaseAdmin.from('analytics_revenue_metrics').select('*').limit(days),
        supabaseAdmin.from('analytics_story_engagement').select('*').limit(days),
        supabaseAdmin.from('analytics_gold_purchase_funnel').select('*').limit(days),
      ]);

      data.overview = {
        daily_active_users: dau.data || [],
        revenue: revenue.data || [],
        story_engagement: engagement.data || [],
        purchase_funnel: funnel.data || [],
      };

      // Calculate summary stats
      const totalRevenue = (revenue.data || []).reduce((sum, row) => sum + (parseFloat(row.total_revenue_usd) || 0), 0);
      const avgDAU = (dau.data || []).reduce((sum, row) => sum + (row.dau || 0), 0) / Math.max(dau.data?.length || 1, 1);
      const totalPurchases = (revenue.data || []).reduce((sum, row) => sum + (row.gold_purchases || 0), 0);
      const avgConversion = (funnel.data || []).reduce((sum, row) => sum + (parseFloat(row.conversion_rate) || 0), 0) / Math.max(funnel.data?.length || 1, 1);

      data.summary = {
        total_revenue_usd: totalRevenue.toFixed(2),
        avg_daily_active_users: Math.round(avgDAU),
        total_gold_purchases: totalPurchases,
        avg_conversion_rate: avgConversion.toFixed(2),
        days_analyzed: days,
      };
    }

    if (metric === 'retention' || metric === 'all') {
      // Get retention cohorts
      const { data: retentionData } = await supabaseAdmin
        .rpc('get_retention_cohorts', { cohort_weeks: Math.ceil(days / 7) });

      data.retention = retentionData || [];
    }

    if (metric === 'users' || metric === 'all') {
      // Get top users by engagement
      const { data: topUsers } = await supabaseAdmin
        .from('analytics_user_engagement')
        .select('*')
        .order('quests_completed', { ascending: false })
        .limit(100);

      data.top_users = topUsers || [];
    }

    if (metric === 'revenue_detail') {
      // Get detailed revenue breakdown
      const { data: purchases } = await supabaseAdmin
        .from('gold_purchases')
        .select(`
          *,
          profile:profiles(email, archetype, level)
        `)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      data.recent_purchases = purchases || [];

      // Revenue by package type
      const packageBreakdown = {};
      (purchases || []).forEach(p => {
        const pkg = p.package_type || 'unknown';
        if (!packageBreakdown[pkg]) {
          packageBreakdown[pkg] = { count: 0, revenue: 0 };
        }
        packageBreakdown[pkg].count++;
        packageBreakdown[pkg].revenue += parseFloat(p.price_usd || 0);
      });

      data.package_breakdown = packageBreakdown;
    }

    if (metric === 'story_metrics') {
      // Get story progression metrics
      const { data: storyStats } = await supabaseAdmin
        .from('profiles')
        .select('current_story_thread, story_progress')
        .not('current_story_thread', 'is', null);

      const threadStats = {};
      let totalCompletion = 0;
      let userCount = 0;

      (storyStats || []).forEach(s => {
        const thread = s.current_story_thread;
        const completion = s.story_progress?.thread_completion || 0;

        if (!threadStats[thread]) {
          threadStats[thread] = { users: 0, avg_completion: 0, total_completion: 0 };
        }

        threadStats[thread].users++;
        threadStats[thread].total_completion += completion;
        totalCompletion += completion;
        userCount++;
      });

      // Calculate averages
      Object.keys(threadStats).forEach(thread => {
        threadStats[thread].avg_completion = (threadStats[thread].total_completion / threadStats[thread].users).toFixed(1);
        delete threadStats[thread].total_completion;
      });

      data.story_metrics = {
        active_stories: threadStats,
        total_users_in_stories: userCount,
        avg_story_completion: userCount > 0 ? (totalCompletion / userCount).toFixed(1) : 0,
      };
    }

    return NextResponse.json({
      success: true,
      data,
      generated_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
