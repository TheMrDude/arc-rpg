import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Cost estimation for Claude API calls
 * Based on Anthropic pricing: https://www.anthropic.com/pricing
 */
const COST_PER_1K_TOKENS = {
  // Claude Sonnet 4.5 (latest)
  'claude-sonnet-4-20250514': {
    input: 0.003,  // $3 per million tokens
    output: 0.015  // $15 per million tokens
  },
  // Fallback for older models
  default: {
    input: 0.003,
    output: 0.015
  }
};

// Estimated token usage per endpoint (conservative estimates)
const ENDPOINT_TOKEN_ESTIMATES = {
  'transform-quest': {
    input: 800,   // Prompt + quest details
    output: 400   // Transformed narrative
  },
  'transform-journal': {
    input: 1000,  // Prompt + journal entry + context
    output: 300   // Transformed narrative (150-250 words)
  },
  'weekly-summary': {
    input: 3000,  // Prompt + week of quest data
    output: 1500  // Long-form narrative
  }
};

/**
 * GET /api/admin/api-costs
 *
 * Monitor API costs and usage patterns
 * Admin only
 */
export async function GET(request) {
  // Check admin authorization
  const { error: adminError, user: adminUser } = await requireAdmin(request);
  if (adminError) return adminError;

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get rate limit data for cost calculation
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: rateLimits, error } = await supabaseAdmin
      .from('api_rate_limits')
      .select(`
        endpoint,
        request_count,
        window_start,
        user_id,
        profiles!inner(is_premium, subscription_status)
      `)
      .gte('window_start', cutoff)
      .in('endpoint', [
        'transform-quest',
        'transform-journal',
        'transform-quest:burst',
        'transform-journal:burst',
        'weekly-summary',
        'weekly-summary:burst'
      ]);

    if (error) {
      console.error('API costs query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API usage data' },
        { status: 500 }
      );
    }

    // Calculate costs
    let totalCost = 0;
    let totalRequests = 0;
    const costsByEndpoint = {};
    const costsByDay = {};
    let premiumRequests = 0;
    let freeRequests = 0;

    rateLimits.forEach(rl => {
      // Skip burst tracking endpoints (they're already counted in main endpoint)
      if (rl.endpoint.includes(':burst')) return;

      const endpoint = rl.endpoint;
      const requests = rl.request_count;
      const isPremium = rl.profiles?.is_premium || rl.profiles?.subscription_status === 'active';

      // Get token estimates
      const tokenEst = ENDPOINT_TOKEN_ESTIMATES[endpoint] || { input: 500, output: 200 };
      const costs = COST_PER_1K_TOKENS['claude-sonnet-4-20250514'];

      // Calculate cost per request
      const costPerRequest = (
        (tokenEst.input / 1000) * costs.input +
        (tokenEst.output / 1000) * costs.output
      );

      const requestCost = costPerRequest * requests;

      totalCost += requestCost;
      totalRequests += requests;

      if (isPremium) {
        premiumRequests += requests;
      } else {
        freeRequests += requests;
      }

      // Group by endpoint
      if (!costsByEndpoint[endpoint]) {
        costsByEndpoint[endpoint] = {
          requests: 0,
          cost: 0,
          avgCostPerRequest: costPerRequest
        };
      }
      costsByEndpoint[endpoint].requests += requests;
      costsByEndpoint[endpoint].cost += requestCost;

      // Group by day
      const day = new Date(rl.window_start).toISOString().split('T')[0];
      if (!costsByDay[day]) {
        costsByDay[day] = {
          requests: 0,
          cost: 0
        };
      }
      costsByDay[day].requests += requests;
      costsByDay[day].cost += requestCost;
    });

    // Calculate projections
    const avgDailyCost = totalCost / days;
    const projectedMonthlyCost = avgDailyCost * 30;
    const projectedYearlyCost = avgDailyCost * 365;

    // Revenue calculation (approximate)
    const { data: premiumCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .or('is_premium.eq.true,subscription_status.eq.active');

    const estimatedMonthlyRevenue = (premiumCount?.length || 0) * 47;
    const costToRevenueRatio = estimatedMonthlyRevenue > 0
      ? (projectedMonthlyCost / estimatedMonthlyRevenue * 100).toFixed(1)
      : 0;

    const stats = {
      period: {
        days,
        startDate: cutoff,
        endDate: new Date().toISOString()
      },
      usage: {
        totalRequests,
        premiumRequests,
        freeRequests,
        premiumPercentage: ((premiumRequests / totalRequests) * 100).toFixed(1)
      },
      costs: {
        total: parseFloat(totalCost.toFixed(2)),
        avgPerRequest: parseFloat((totalCost / totalRequests).toFixed(4)),
        avgPerDay: parseFloat(avgDailyCost.toFixed(2)),
        byEndpoint: Object.entries(costsByEndpoint).map(([endpoint, data]) => ({
          endpoint,
          requests: data.requests,
          cost: parseFloat(data.cost.toFixed(2)),
          avgCostPerRequest: parseFloat(data.avgCostPerRequest.toFixed(4)),
          percentage: ((data.cost / totalCost) * 100).toFixed(1)
        })).sort((a, b) => b.cost - a.cost),
        byDay: Object.entries(costsByDay).map(([day, data]) => ({
          day,
          requests: data.requests,
          cost: parseFloat(data.cost.toFixed(2))
        })).sort((a, b) => a.day.localeCompare(b.day))
      },
      projections: {
        monthly: parseFloat(projectedMonthlyCost.toFixed(2)),
        yearly: parseFloat(projectedYearlyCost.toFixed(2))
      },
      business: {
        premiumUsers: premiumCount?.length || 0,
        estimatedMonthlyRevenue,
        costToRevenueRatio: parseFloat(costToRevenueRatio),
        netMonthlyProfit: parseFloat((estimatedMonthlyRevenue - projectedMonthlyCost).toFixed(2))
      }
    };

    console.log('Admin viewed API costs:', {
      adminId: adminUser.id,
      adminEmail: adminUser.email,
      days,
      totalCost: stats.costs.total,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin API costs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
