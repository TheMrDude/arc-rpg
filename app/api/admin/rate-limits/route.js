import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/rate-limits
 *
 * View all users' rate limit status for monitoring
 * Admin only
 */
export async function GET(request) {
  // Check admin authorization
  const { error: adminError, user: adminUser } = await requireAdmin(request);
  if (adminError) return adminError;

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const endpoint = searchParams.get('endpoint');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Build query
    let query = supabaseAdmin
      .from('api_rate_limits')
      .select(`
        id,
        user_id,
        endpoint,
        request_count,
        window_start,
        created_at,
        profiles!inner(id, archetype, level, is_premium, subscription_status)
      `)
      .order('window_start', { ascending: false })
      .limit(limit);

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Filter by endpoint if specified
    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    // Only show recent windows (last 48 hours)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    query = query.gte('window_start', cutoff);

    const { data: rateLimits, error } = await query;

    if (error) {
      console.error('Admin rate limits query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rate limits' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      totalRequests: rateLimits.reduce((sum, rl) => sum + rl.request_count, 0),
      uniqueUsers: new Set(rateLimits.map(rl => rl.user_id)).size,
      byEndpoint: {},
      topUsers: {}
    };

    // Group by endpoint
    rateLimits.forEach(rl => {
      if (!stats.byEndpoint[rl.endpoint]) {
        stats.byEndpoint[rl.endpoint] = {
          requests: 0,
          users: new Set()
        };
      }
      stats.byEndpoint[rl.endpoint].requests += rl.request_count;
      stats.byEndpoint[rl.endpoint].users.add(rl.user_id);
    });

    // Convert Sets to counts
    Object.keys(stats.byEndpoint).forEach(endpoint => {
      stats.byEndpoint[endpoint].users = stats.byEndpoint[endpoint].users.size;
    });

    // Find top users by request count
    const userRequests = {};
    rateLimits.forEach(rl => {
      if (!userRequests[rl.user_id]) {
        userRequests[rl.user_id] = {
          userId: rl.user_id,
          totalRequests: 0,
          isPremium: rl.profiles?.is_premium || rl.profiles?.subscription_status === 'active',
          archetype: rl.profiles?.archetype,
          level: rl.profiles?.level
        };
      }
      userRequests[rl.user_id].totalRequests += rl.request_count;
    });

    stats.topUsers = Object.values(userRequests)
      .sort((a, b) => b.totalRequests - a.totalRequests)
      .slice(0, 10);

    console.log('Admin viewed rate limits:', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      filters: { userId, endpoint },
      resultsCount: rateLimits.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      rateLimits,
      stats,
      meta: {
        count: rateLimits.length,
        limit,
        filters: { userId, endpoint }
      }
    });
  } catch (error) {
    console.error('Admin rate limits error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
