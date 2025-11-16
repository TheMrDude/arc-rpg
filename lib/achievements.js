import { supabase } from './supabase';

/**
 * Check and unlock any achievements the user has earned
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object>} - Newly unlocked achievements and stats
 */
export async function checkAchievements(userId) {
  try {
    const { data, error } = await supabase
      .rpc('check_achievements', {
        p_user_id: userId
      });

    if (error) throw error;

    const result = data && data.length > 0 ? data[0] : null;

    return {
      success: true,
      newlyUnlocked: result?.newly_unlocked || [],
      totalUnlocked: result?.total_unlocked || 0,
      achievementPoints: result?.achievement_points || 0
    };
  } catch (error) {
    console.error('Error checking achievements:', error);
    return {
      success: false,
      error: error.message,
      newlyUnlocked: [],
      totalUnlocked: 0,
      achievementPoints: 0
    };
  }
}

/**
 * Get all available achievements
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} - Array of achievement objects
 */
export async function getAllAchievements(category = null) {
  try {
    let query = supabase
      .from('achievements')
      .select('*')
      .order('unlock_order', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
}

/**
 * Get user's unlocked achievements
 * @param {string} userId - The user's UUID
 * @returns {Promise<Array>} - Array of unlocked achievement objects
 */
export async function getUserAchievements(userId) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }
}

/**
 * Get achievement progress for a specific achievement
 * @param {string} userId - The user's UUID
 * @param {string} achievementId - The achievement ID
 * @returns {Promise<Object|null>} - Progress object or null
 */
export async function getAchievementProgress(userId, achievementId) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found errors
    return data;
  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    return null;
  }
}

/**
 * Get tier color for achievement badges
 * @param {string} tier - Achievement tier
 * @returns {Object} - Color classes for the tier
 */
export function getTierColors(tier) {
  const colors = {
    bronze: {
      bg: 'bg-gradient-to-br from-amber-600 to-amber-800',
      border: 'border-amber-700',
      text: 'text-amber-100',
      glow: 'shadow-[0_0_20px_rgba(217,119,6,0.5)]'
    },
    silver: {
      bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
      border: 'border-gray-400',
      text: 'text-gray-900',
      glow: 'shadow-[0_0_20px_rgba(156,163,175,0.5)]'
    },
    gold: {
      bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      border: 'border-yellow-500',
      text: 'text-yellow-900',
      glow: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]'
    },
    platinum: {
      bg: 'bg-gradient-to-br from-cyan-300 to-cyan-600',
      border: 'border-cyan-400',
      text: 'text-cyan-900',
      glow: 'shadow-[0_0_20px_rgba(34,211,238,0.6)]'
    },
    diamond: {
      bg: 'bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400',
      border: 'border-purple-500',
      text: 'text-white',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.8)]'
    }
  };

  return colors[tier] || colors.bronze;
}

/**
 * Get category icon and name
 * @param {string} category - Achievement category
 * @returns {Object} - Icon and display name
 */
export function getCategoryInfo(category) {
  const categories = {
    quest_master: { icon: '⚔️', name: 'Quest Master' },
    level_up: { icon: '📈', name: 'Level Up' },
    streak: { icon: '🔥', name: 'Streak' },
    wealth: { icon: '💰', name: 'Wealth' },
    exploration: { icon: '🗺️', name: 'Exploration' },
    wisdom: { icon: '📚', name: 'Wisdom' },
    special: { icon: '⭐', name: 'Special' }
  };

  return categories[category] || { icon: '🏆', name: 'Achievement' };
}

/**
 * Calculate achievement completion percentage
 * @param {Array} userAchievements - User's unlocked achievements
 * @param {Array} allAchievements - All available achievements
 * @returns {number} - Completion percentage (0-100)
 */
export function calculateCompletionPercentage(userAchievements, allAchievements) {
  if (!allAchievements || allAchievements.length === 0) return 0;
  if (!userAchievements) return 0;

  return Math.round((userAchievements.length / allAchievements.length) * 100);
}

/**
 * Get next achievement to unlock in a category
 * @param {string} category - Achievement category
 * @param {Array} userAchievements - User's unlocked achievements
 * @param {Array} allAchievements - All available achievements
 * @returns {Object|null} - Next achievement or null
 */
export function getNextAchievement(category, userAchievements, allAchievements) {
  const unlockedIds = userAchievements.map(ua => ua.achievement_id);
  const categoryAchievements = allAchievements
    .filter(a => a.category === category && !unlockedIds.includes(a.id))
    .sort((a, b) => a.unlock_order - b.unlock_order);

  return categoryAchievements[0] || null;
}
