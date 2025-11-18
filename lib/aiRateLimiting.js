import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Rate limits per feature (per day)
const RATE_LIMITS = {
  backstory: 3,        // 3 backstory generations per day
  suggestions: 10,     // 10 quest suggestion batches per day
  transform: 50,       // 50 quest transformations per day (existing feature)
};

/**
 * Check if user has exceeded their daily AI usage limit
 * @param {string} userId - User ID
 * @param {string} feature - Feature name ('backstory', 'suggestions', 'transform')
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: string}>}
 */
export async function checkAIRateLimit(userId, feature) {
  try {
    const limit = RATE_LIMITS[feature];
    if (!limit) {
      throw new Error(`Unknown feature: ${feature}`);
    }

    // Get today's usage
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ai_usage_log')
      .select('id')
      .eq('user_id', userId)
      .eq('feature', feature)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (error) throw error;

    const usedToday = data?.length || 0;
    const remaining = Math.max(0, limit - usedToday);
    const allowed = remaining > 0;

    // Calculate reset time (midnight tonight)
    const resetAt = new Date();
    resetAt.setHours(23, 59, 59, 999);

    return {
      allowed,
      remaining,
      usedToday,
      limit,
      resetAt: resetAt.toISOString(),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return { allowed: true, remaining: 0, usedToday: 0, limit: 0, resetAt: null };
  }
}

/**
 * Log AI usage for rate limiting
 * @param {string} userId - User ID
 * @param {string} feature - Feature name
 * @param {object} metadata - Optional metadata about the usage
 */
export async function logAIUsage(userId, feature, metadata = {}) {
  try {
    const { error } = await supabase
      .from('ai_usage_log')
      .insert({
        user_id: userId,
        feature: feature,
        metadata: metadata,
      });

    if (error) throw error;
  } catch (error) {
    console.error('AI usage logging error:', error);
    // Don't throw - logging failure shouldn't break the feature
  }
}

/**
 * Get user's AI usage stats for today
 * @param {string} userId - User ID
 * @returns {Promise<object>} - Usage stats by feature
 */
export async function getAIUsageStats(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('ai_usage_log')
      .select('feature')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);

    if (error) throw error;

    const stats = {};
    for (const feature in RATE_LIMITS) {
      const used = data?.filter(log => log.feature === feature).length || 0;
      stats[feature] = {
        used,
        limit: RATE_LIMITS[feature],
        remaining: Math.max(0, RATE_LIMITS[feature] - used),
      };
    }

    return stats;
  } catch (error) {
    console.error('Get AI usage stats error:', error);
    return {};
  }
}
