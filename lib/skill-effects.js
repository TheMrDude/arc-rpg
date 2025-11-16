/**
 * SKILL EFFECTS SYSTEM
 *
 * Makes unlocked skills actually functional by applying their bonuses to gameplay.
 *
 * Skill categories:
 * - Power: XP bonuses
 * - Wisdom: Story and AI enhancements
 * - Efficiency: Speed and multitasking bonuses
 * - Fortune: Luck and random bonuses
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all unlocked skills for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of unlocked skill IDs
 */
export async function getUserUnlockedSkills(userId) {
  const { data, error } = await supabaseAdmin
    .from('unlocked_skills')
    .select('skill_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching unlocked skills:', error);
    return [];
  }

  return data.map(s => s.skill_id);
}

/**
 * Calculate total XP bonus from skills
 * @param {Array} unlockedSkills - Array of unlocked skill IDs
 * @param {string} difficulty - Quest difficulty (easy, medium, hard)
 * @param {number} baseXP - Base XP before bonuses
 * @returns {object} { multiplier: number, bonusXP: number, totalXP: number }
 */
export function calculateXPBonus(unlockedSkills, difficulty, baseXP) {
  let multiplier = 1.0;

  // Power Tree - General XP bonuses
  if (unlockedSkills.includes('power_1')) {
    multiplier += 0.05; // +5% XP on all quests
  }
  if (unlockedSkills.includes('power_2')) {
    multiplier += 0.05; // +10% total (stacks with power_1)
  }
  if (unlockedSkills.includes('power_3') && difficulty === 'hard') {
    multiplier += 0.20; // +20% XP on hard quests
  }

  // Efficiency Tree - Easy quest bonuses
  if (difficulty === 'easy') {
    if (unlockedSkills.includes('efficiency_1')) {
      multiplier += 0.20; // Easy quests give +2 XP (on 10 base = 20%)
    }
    if (unlockedSkills.includes('efficiency_2')) {
      multiplier += 0.30; // Easy quests give +5 XP total (on 10 base = 50%)
    }
  }

  const bonusXP = Math.floor(baseXP * (multiplier - 1.0));
  const totalXP = baseXP + bonusXP;

  return {
    multiplier,
    bonusXP,
    totalXP,
    appliedSkills: unlockedSkills.filter(s =>
      s.startsWith('power_') || s.startsWith('efficiency_')
    )
  };
}

/**
 * Check for streak bonus from skills
 * @param {Array} unlockedSkills - Array of unlocked skill IDs
 * @param {number} currentStreak - User's current streak
 * @param {number} baseXP - Base XP before bonuses
 * @returns {number} Bonus XP from streak
 */
export function calculateStreakBonus(unlockedSkills, currentStreak, baseXP) {
  // Power 4: Unstoppable - Streaks give bonus XP
  if (unlockedSkills.includes('power_4') && currentStreak >= 3) {
    // Give 2% bonus per day of streak, max 20%
    const streakMultiplier = Math.min(currentStreak * 0.02, 0.20);
    return Math.floor(baseXP * streakMultiplier);
  }
  return 0;
}

/**
 * Check for luck-based double XP proc
 * @param {Array} unlockedSkills - Array of unlocked skill IDs
 * @returns {boolean} Whether double XP procced
 */
export function checkLuckyProc(unlockedSkills) {
  let luckChance = 0;

  if (unlockedSkills.includes('fortune_1')) {
    luckChance += 0.10; // 10% chance
  }
  if (unlockedSkills.includes('fortune_2')) {
    luckChance += 0.10; // 20% total chance
  }
  if (unlockedSkills.includes('fortune_5')) {
    luckChance *= 2; // All luck chances doubled
  }

  return Math.random() < luckChance;
}

/**
 * Calculate all bonuses and apply to XP
 * @param {string} userId - User ID
 * @param {string} difficulty - Quest difficulty
 * @param {number} baseXP - Base XP value
 * @param {number} currentStreak - Current streak
 * @returns {Promise<object>} XP calculation details
 */
export async function calculateFinalXP(userId, difficulty, baseXP, currentStreak) {
  const unlockedSkills = await getUserUnlockedSkills(userId);

  // Calculate XP bonuses from skills
  const xpBonus = calculateXPBonus(unlockedSkills, difficulty, baseXP);

  // Calculate streak bonus
  const streakBonus = calculateStreakBonus(unlockedSkills, currentStreak, baseXP);

  // Check for lucky proc (double XP)
  const luckyProc = checkLuckyProc(unlockedSkills);

  let finalXP = xpBonus.totalXP + streakBonus;

  if (luckyProc) {
    finalXP *= 2;
  }

  return {
    baseXP,
    skillBonusXP: xpBonus.bonusXP,
    streakBonusXP: streakBonus,
    luckyProc,
    finalXP,
    breakdown: {
      multiplier: xpBonus.multiplier,
      appliedSkills: xpBonus.appliedSkills,
      streakDays: currentStreak,
    }
  };
}

/**
 * Check if user has a specific wisdom skill (for story enhancements)
 * @param {string} userId - User ID
 * @param {string} skillId - Skill ID to check
 * @returns {Promise<boolean>}
 */
export async function hasWisdomSkill(userId, skillId) {
  const skills = await getUserUnlockedSkills(userId);
  return skills.includes(skillId);
}

/**
 * Get multitasker bonus (Efficiency 3)
 * @param {Array} unlockedSkills - Array of unlocked skill IDs
 * @param {number} questsCompletedToday - Number of quests completed today
 * @returns {number} Bonus XP if threshold met
 */
export function checkMultitaskerBonus(unlockedSkills, questsCompletedToday) {
  // Efficiency 3: Complete 5 quests for bonus 50 XP
  if (unlockedSkills.includes('efficiency_3') && questsCompletedToday >= 5) {
    return 50;
  }
  return 0;
}

/**
 * Check if it's Friday and user has Time Lord skill (Efficiency 5)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether Friday double XP is active
 */
export async function checkDoubleFriday(userId) {
  const unlockedSkills = await getUserUnlockedSkills(userId);
  const today = new Date().getDay(); // 0 = Sunday, 5 = Friday
  return unlockedSkills.includes('efficiency_5') && today === 5;
}
