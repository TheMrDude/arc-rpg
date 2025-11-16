import { supabase } from './supabase';

/**
 * Update map progression for a user based on their current level and quest completion
 * This function calls the database RPC to calculate new regions unlocked
 * @param {string} userId - The user's UUID
 * @returns {Promise<Object>} - Object containing new_region, regions_revealed, progress_percentage, milestone_unlocked
 */
export async function updateMapProgression(userId) {
  try {
    const { data, error } = await supabase
      .rpc('update_map_progression', {
        p_user_id: userId
      });

    if (error) throw error;

    // The RPC returns an array with a single row
    const result = data && data.length > 0 ? data[0] : null;

    return {
      success: true,
      newRegion: result?.new_region,
      regionsRevealed: result?.regions_revealed || [],
      progressPercentage: result?.progress_percentage || 0,
      milestoneUnlocked: result?.milestone_unlocked || false
    };
  } catch (error) {
    console.error('Error updating map progression:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get all map regions with their details
 * @returns {Promise<Array>} - Array of map region objects
 */
export async function getMapRegions() {
  try {
    const { data, error } = await supabase
      .from('map_regions')
      .select('*')
      .order('unlock_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching map regions:', error);
    return [];
  }
}

/**
 * Get a specific region's details
 * @param {string} regionId - The region ID
 * @returns {Promise<Object|null>} - Region object or null
 */
export async function getRegionDetails(regionId) {
  try {
    const { data, error } = await supabase
      .from('map_regions')
      .select('*')
      .eq('id', regionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching region details:', error);
    return null;
  }
}

/**
 * Check if a user can unlock a specific region
 * @param {Object} profile - User profile object
 * @param {Object} region - Region object to check
 * @param {number} totalQuests - Total completed quests
 * @returns {boolean} - True if region can be unlocked
 */
export function canUnlockRegion(profile, region, totalQuests) {
  if (!profile || !region) return false;

  return (
    profile.level >= region.required_level &&
    totalQuests >= region.required_quests
  );
}

/**
 * Get the next region that can be unlocked
 * @param {Object} profile - User profile object
 * @param {Array} allRegions - All map regions
 * @param {number} totalQuests - Total completed quests
 * @returns {Object|null} - Next unlockable region or null
 */
export function getNextUnlockableRegion(profile, allRegions, totalQuests) {
  if (!profile || !allRegions) return null;

  const revealedRegions = profile.map_regions_revealed || [];

  // Find the first region that isn't revealed but can be unlocked
  return allRegions.find(region =>
    !revealedRegions.includes(region.id) &&
    canUnlockRegion(profile, region, totalQuests)
  );
}

/**
 * Calculate quests needed for next region unlock
 * @param {Object} profile - User profile object
 * @param {Array} allRegions - All map regions
 * @param {number} totalQuests - Total completed quests
 * @returns {Object} - Object with nextRegion and questsNeeded
 */
export function getProgressToNextRegion(profile, allRegions, totalQuests) {
  if (!profile || !allRegions) {
    return { nextRegion: null, questsNeeded: 0, levelsNeeded: 0 };
  }

  const revealedRegions = profile.map_regions_revealed || [];

  // Find the next unrevealed region in order
  const nextRegion = allRegions.find(region =>
    !revealedRegions.includes(region.id)
  );

  if (!nextRegion) {
    return { nextRegion: null, questsNeeded: 0, levelsNeeded: 0 };
  }

  const questsNeeded = Math.max(0, nextRegion.required_quests - totalQuests);
  const levelsNeeded = Math.max(0, nextRegion.required_level - profile.level);

  return {
    nextRegion,
    questsNeeded,
    levelsNeeded,
    canUnlock: questsNeeded === 0 && levelsNeeded === 0
  };
}

/**
 * Format region type for display
 * @param {string} regionType - Raw region type from database
 * @returns {string} - Formatted region type
 */
export function formatRegionType(regionType) {
  const types = {
    'exploration': 'Exploration Zone',
    'milestone': 'Major Milestone',
    'boss_battle': 'Challenge Area',
    'sanctuary': 'Safe Haven'
  };
  return types[regionType] || regionType;
}
