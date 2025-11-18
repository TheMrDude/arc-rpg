import { SupabaseClient } from '@supabase/supabase-js';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastRewardDate: string | null;
  canClaimToday: boolean;
  streakBroken: boolean;
}

/**
 * Calculate streak rewards based on streak length
 */
export function calculateStreakReward(streakDay: number): {
  xp: number;
  title: string;
  description: string;
} {
  // Base reward
  let xp = 50;
  let title = 'Daily Login Bonus';
  let description = 'Keep your streak alive!';

  // Milestone rewards
  if (streakDay === 7) {
    xp = 200;
    title = '🔥 7-Day Warrior';
    description = 'One week of dedication!';
  } else if (streakDay === 14) {
    xp = 400;
    title = '⚡ 2-Week Champion';
    description = 'Consistency is your superpower!';
  } else if (streakDay === 30) {
    xp = 1000;
    title = '👑 Monthly Master';
    description = 'A full month of commitment!';
  } else if (streakDay === 60) {
    xp = 2000;
    title = '🏆 60-Day Legend';
    description = 'Unstoppable dedication!';
  } else if (streakDay === 90) {
    xp = 3000;
    title = '💎 90-Day Elite';
    description = 'You are a true champion!';
  } else if (streakDay === 365) {
    xp = 10000;
    title = '⭐ Yearly Hero';
    description = 'A full year of conquest!';
  } else if (streakDay % 10 === 0) {
    // Every 10 days gets a bonus
    xp = 100;
    title = `${streakDay}-Day Milestone`;
    description = 'Bonus XP for your dedication!';
  } else if (streakDay > 1) {
    // Progressive bonus for maintaining streak
    xp = 50 + Math.floor((streakDay - 1) * 5);
    title = `Day ${streakDay} Bonus`;
    description = `Your streak is ${streakDay} days strong!`;
  }

  return { xp, title, description };
}

/**
 * Check if user can claim daily reward
 */
export async function checkStreakStatus(
  userId: string,
  supabase: SupabaseClient
): Promise<StreakData> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_daily_reward, streak_updated_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Error fetching streak data:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastRewardDate: null,
      canClaimToday: true,
      streakBroken: false,
    };
  }

  const now = new Date();
  const lastReward = profile.last_daily_reward ? new Date(profile.last_daily_reward) : null;
  const streakUpdated = profile.streak_updated_at ? new Date(profile.streak_updated_at) : null;

  // Check if reward already claimed today
  const canClaimToday = !lastReward || !isSameDay(lastReward, now);

  // Check if streak is broken (more than 1 day since last update)
  const streakBroken =
    streakUpdated &&
    !isSameDay(streakUpdated, now) &&
    !isYesterday(streakUpdated, now);

  return {
    currentStreak: profile.current_streak || 0,
    longestStreak: profile.longest_streak || 0,
    lastRewardDate: profile.last_daily_reward,
    canClaimToday,
    streakBroken,
  };
}

/**
 * Claim daily reward and update streak
 */
export async function claimDailyReward(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  success: boolean;
  reward?: { xp: number; title: string; description: string };
  newStreak?: number;
  newLevel?: number;
  message?: string;
}> {
  try {
    const streakStatus = await checkStreakStatus(userId, supabase);

    if (!streakStatus.canClaimToday) {
      return {
        success: false,
        message: 'You have already claimed your daily reward today!',
      };
    }

    // Calculate new streak
    let newStreak = streakStatus.currentStreak;
    if (streakStatus.streakBroken) {
      newStreak = 1; // Reset to 1
    } else {
      newStreak += 1;
    }

    // Calculate reward
    const reward = calculateStreakReward(newStreak);

    // Get current profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, level, longest_streak')
      .eq('id', userId)
      .single();

    if (!profile) {
      return { success: false, message: 'Profile not found' };
    }

    const newXP = profile.xp + reward.xp;
    const newLongestStreak = Math.max(newStreak, profile.longest_streak || 0);

    // Check for level up
    let newLevel = profile.level;
    if (newXP >= newLevel * 100) {
      newLevel += 1;
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_daily_reward: new Date().toISOString(),
        streak_updated_at: new Date().toISOString(),
        xp: newXP,
        level: newLevel,
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating streak:', error);
      return { success: false, message: 'Failed to claim reward' };
    }

    return {
      success: true,
      reward,
      newStreak,
      newLevel,
    };
  } catch (error) {
    console.error('Error in claimDailyReward:', error);
    return { success: false, message: 'Something went wrong' };
  }
}

/**
 * Helper: Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper: Check if date1 is yesterday relative to date2
 */
function isYesterday(date1: Date, date2: Date): boolean {
  const yesterday = new Date(date2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date1, yesterday);
}

/**
 * Get streak calendar for display (last 7 days)
 */
export function getStreakCalendar(currentStreak: number): {
  day: string;
  completed: boolean;
}[] {
  const calendar = [];
  const today = new Date();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayName = daysOfWeek[date.getDay()];
    const completed = i < currentStreak && currentStreak >= i + 1;

    calendar.push({
      day: dayName,
      completed,
    });
  }

  return calendar;
}
