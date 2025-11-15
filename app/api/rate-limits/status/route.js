import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { RATE_LIMITS } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * Get rate limit status for current user
 * Returns current usage for quest transforms and journal transforms
 */
export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Get user's premium status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    // Calculate current 24-hour window start
    const windowStart = new Date();
    windowStart.setHours(0, 0, 0, 0);

    // Get rate limit data for quest transforms
    const { data: questLimits } = await supabaseAdmin
      .from('api_rate_limits')
      .select('request_count, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', 'transform-quest')
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get rate limit data for journal transforms
    const { data: journalLimits } = await supabaseAdmin
      .from('api_rate_limits')
      .select('request_count, window_start')
      .eq('user_id', user.id)
      .eq('endpoint', 'transform-journal')
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get limits from config
    const questConfig = RATE_LIMITS['transform-quest'];
    const journalConfig = RATE_LIMITS['transform-journal'];

    const questLimit = isPremium ? questConfig.premium.limit : questConfig.free.limit;
    const journalLimit = isPremium ? journalConfig.premium.limit : journalConfig.free.limit;

    // Calculate reset time (end of current day)
    const resetAt = new Date();
    resetAt.setHours(23, 59, 59, 999);

    return NextResponse.json({
      isPremium,
      limits: {
        questTransforms: {
          current: questLimits?.request_count || 0,
          limit: questLimit,
          resetAt: resetAt.toISOString(),
        },
        journalTransforms: {
          current: journalLimits?.request_count || 0,
          limit: journalLimit,
          resetAt: resetAt.toISOString(),
        },
      },
      tier: isPremium ? 'premium' : 'free',
    });
  } catch (error) {
    console.error('Rate limit status error:', error);

    return NextResponse.json({
      error: 'Failed to fetch rate limit status'
    }, { status: 500 });
  }
}
