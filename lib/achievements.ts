import { SupabaseClient } from '@supabase/supabase-js';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'quests' | 'streaks' | 'social' | 'levels' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  requirement_value?: number;
  is_secret: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  notified: boolean;
  achievement?: Achievement;
}

/**
 * Get all achievements
 */
export async function getAllAchievements(
  supabase: SupabaseClient
): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('category', { ascending: true })
    .order('requirement_value', { ascending: true });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(
  userId: string,
  supabase: SupabaseClient
): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievement:achievements(*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get achievement stats for user
 */
export async function getAchievementStats(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  totalUnlocked: number;
  totalAvailable: number;
  achievementPoints: number;
  recentAchievements: UserAchievement[];
  byCategory: Record<string, number>;
  byRarity: Record<string, number>;
}> {
  // Get all achievements
  const allAchievements = await getAllAchievements(supabase);

  // Get user's achievements
  const userAchievements = await getUserAchievements(userId, supabase);

  // Get profile achievement points
  const { data: profile } = await supabase
    .from('profiles')
    .select('achievement_points')
    .eq('id', userId)
    .single();

  // Count by category
  const byCategory: Record<string, number> = {
    quests: 0,
    streaks: 0,
    social: 0,
    levels: 0,
    special: 0,
  };

  userAchievements.forEach((ua) => {
    if (ua.achievement) {
      byCategory[ua.achievement.category] = (byCategory[ua.achievement.category] || 0) + 1;
    }
  });

  // Count by rarity
  const byRarity: Record<string, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };

  userAchievements.forEach((ua) => {
    if (ua.achievement) {
      byRarity[ua.achievement.rarity] = (byRarity[ua.achievement.rarity] || 0) + 1;
    }
  });

  return {
    totalUnlocked: userAchievements.length,
    totalAvailable: allAchievements.length,
    achievementPoints: profile?.achievement_points || 0,
    recentAchievements: userAchievements.slice(0, 5),
    byCategory,
    byRarity,
  };
}

/**
 * Check achievements for user (triggers database function)
 */
export async function checkAchievements(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('check_achievements_for_user', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error checking achievements:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in checkAchievements:', error);
    return false;
  }
}

/**
 * Unlock specific achievement
 */
export async function unlockAchievement(
  userId: string,
  achievementKey: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_and_unlock_achievement', {
      p_user_id: userId,
      p_achievement_key: achievementKey,
    });

    if (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in unlockAchievement:', error);
    return false;
  }
}

/**
 * Get rarity color for UI
 */
export function getRarityColor(rarity: string): {
  bg: string;
  border: string;
  text: string;
  glow: string;
} {
  switch (rarity) {
    case 'legendary':
      return {
        bg: 'from-[#FFD700] to-[#FFA500]',
        border: 'border-[#FFD700]',
        text: 'text-[#FFD700]',
        glow: 'shadow-[0_0_20px_rgba(255,215,0,0.5)]',
      };
    case 'epic':
      return {
        bg: 'from-[#9D4EDD] to-[#7209B7]',
        border: 'border-[#9D4EDD]',
        text: 'text-[#9D4EDD]',
        glow: 'shadow-[0_0_20px_rgba(157,78,221,0.5)]',
      };
    case 'rare':
      return {
        bg: 'from-[#3B82F6] to-[#1E40AF]',
        border: 'border-[#3B82F6]',
        text: 'text-[#3B82F6]',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
      };
    default: // common
      return {
        bg: 'from-[#6B7280] to-[#374151]',
        border: 'border-[#6B7280]',
        text: 'text-[#6B7280]',
        glow: '',
      };
  }
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: string): string {
  switch (category) {
    case 'quests':
      return '⚔️';
    case 'streaks':
      return '🔥';
    case 'social':
      return '👥';
    case 'levels':
      return '⭐';
    case 'special':
      return '🏆';
    default:
      return '🎖️';
  }
}
