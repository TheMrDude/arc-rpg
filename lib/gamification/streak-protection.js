/**
 * Streak Protection System
 *
 * Implements Duolingo's "Streak Freeze" mechanic to reduce churn by 21%
 * Users can purchase streak freezes with XP to protect against missing days
 */

import { createClient } from '@/lib/supabase-server';

/**
 * Purchase a streak freeze for the given user
 * Costs 50 XP, adds 1 freeze to the user's bank
 *
 * @param userId - The UUID of the user purchasing the freeze
 * @returns Result indicating success or failure with updated values
 */
export async function purchaseStreakFreeze(userId) {
  try {
    const supabase = createClient();

    // Call the database function
    const { data, error } = await supabase
      .rpc('purchase_streak_freeze', { user_id: userId });

    if (error) {
      console.error('Error purchasing streak freeze:', error);
      return {
        success: false,
        error: error.message || 'Failed to purchase streak freeze'
      };
    }

    return data;
  } catch (error) {
    console.error('Exception in purchaseStreakFreeze:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Check if the user's streak has been broken or protected
 * This should be called on login or when user opens the app
 *
 * @param userId - The UUID of the user to check
 * @param lastActiveDate - Optional: The last known activity date (for client-side pre-check)
 * @returns Streak status with appropriate message
 */
export async function checkStreakBreak(
  userId,
  lastActiveDate
) {
  try {
    const supabase = createClient();

    // If lastActiveDate is provided, do a quick client-side check
    if (lastActiveDate) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // If active today, no need to check server
      if (daysSinceActivity === 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('streak_count')
          .eq('id', userId)
          .single();

        return {
          status: 'safe',
          streakCount: profile?.streak_count || 0,
          message: 'Your streak is active!'
        };
      }
    }

    // Call the database function for comprehensive check
    const { data, error } = await supabase
      .rpc('check_streak_status', { user_id: userId });

    if (error) {
      console.error('Error checking streak status:', error);
      return {
        status: 'safe',
        streakCount: 0,
        message: 'Unable to check streak status'
      };
    }

    return {
      status: data.status,
      streakCount: data.streak_count,
      previousStreak: data.previous_streak,
      message: data.message,
      freezeUsed: data.freeze_used
    };
  } catch (error) {
    console.error('Exception in checkStreakBreak:', error);
    return {
      status: 'safe',
      streakCount: 0,
      message: 'Unable to check streak status'
    };
  }
}

/**
 * Get the current freeze count for a user
 *
 * @param userId - The UUID of the user
 * @returns Number of freezes the user has banked
 */
export async function getFreezeCount(userId) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('streak_freeze_count')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting freeze count:', error);
      return 0;
    }

    return data?.streak_freeze_count || 0;
  } catch (error) {
    console.error('Exception in getFreezeCount:', error);
    return 0;
  }
}

/**
 * Check if a streak freeze is currently active
 *
 * @param userId - The UUID of the user
 * @returns Whether a freeze is currently protecting the streak
 */
export async function isFreezeActive(userId) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('streak_freeze_active')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking freeze active status:', error);
      return false;
    }

    return data?.streak_freeze_active || false;
  } catch (error) {
    console.error('Exception in isFreezeActive:', error);
    return false;
  }
}

/**
 * Constants for the streak freeze system
 */
export const STREAK_FREEZE_COST = 50; // XP cost to purchase a freeze
export const MAX_FREEZE_COUNT = 10; // Maximum number of freezes a user can bank

/**
 * Calculate how many freezes a user can afford with their current XP
 *
 * @param currentXP - User's current XP
 * @returns Number of freezes they can purchase
 */
export function calculateAffordableFreeezes(currentXP) {
  return Math.min(
    Math.floor(currentXP / STREAK_FREEZE_COST),
    MAX_FREEZE_COUNT
  );
}

/**
 * Get user's full streak protection status
 * Useful for displaying comprehensive info in UI
 *
 * @param userId - The UUID of the user
 * @returns Complete streak protection information
 */
export async function getStreakProtectionStatus(userId) {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('xp, streak_count, streak_freeze_count, streak_freeze_active, last_activity_date')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting streak protection status:', error);
      return null;
    }

    return {
      xp: data.xp || 0,
      streakCount: data.streak_count || 0,
      freezeCount: data.streak_freeze_count || 0,
      freezeActive: data.streak_freeze_active || false,
      lastActivityDate: data.last_activity_date,
      canAfford: data.xp >= STREAK_FREEZE_COST,
      affordableFreeezes: calculateAffordableFreeezes(data.xp || 0)
    };
  } catch (error) {
    console.error('Exception in getStreakProtectionStatus:', error);
    return null;
  }
}
