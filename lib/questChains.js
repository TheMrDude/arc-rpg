import { supabase } from './supabase';

/**
 * Get all available quest chains
 * @param {number} userLevel - User's current level
 * @returns {Promise<Array>} - Available quest chains
 */
export async function getAvailableQuestChains(userLevel = 1) {
  try {
    const { data, error } = await supabase
      .from('quest_chains')
      .select('*')
      .lte('unlocks_at_level', userLevel)
      .order('unlocks_at_level', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching quest chains:', error);
    return [];
  }
}

/**
 * Get user's quest chain progress
 * @param {string} userId - User's UUID
 * @returns {Promise<Array>} - User's chain progress
 */
export async function getUserQuestChainProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('user_quest_chain_progress')
      .select(`
        *,
        quest_chains (*)
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching user quest chain progress:', error);
    return [];
  }
}

/**
 * Start a quest chain
 * @param {string} userId - User's UUID
 * @param {string} chainId - Chain ID to start
 * @returns {Promise<Object>} - Result of starting chain
 */
export async function startQuestChain(userId, chainId) {
  try {
    const { data, error } = await supabase
      .rpc('start_quest_chain', {
        p_user_id: userId,
        p_chain_id: chainId
      });

    if (error) throw error;

    const result = data && data.length > 0 ? data[0] : null;

    return {
      success: result?.success || false,
      message: result?.message || 'Failed to start quest chain',
      currentStep: result?.current_step || 0
    };
  } catch (error) {
    console.error('Error starting quest chain:', error);
    return {
      success: false,
      message: error.message,
      currentStep: 0
    };
  }
}

/**
 * Advance to next step in quest chain
 * @param {string} userId - User's UUID
 * @param {string} chainId - Chain ID
 * @returns {Promise<Object>} - Result with next step info
 */
export async function advanceQuestChain(userId, chainId) {
  try {
    const { data, error } = await supabase
      .rpc('advance_quest_chain', {
        p_user_id: userId,
        p_chain_id: chainId
      });

    if (error) throw error;

    const result = data && data.length > 0 ? data[0] : null;

    return {
      success: result?.success || false,
      newStep: result?.new_step || 0,
      chainCompleted: result?.chain_completed || false,
      stepInfo: result?.step_info || {}
    };
  } catch (error) {
    console.error('Error advancing quest chain:', error);
    return {
      success: false,
      newStep: 0,
      chainCompleted: false,
      stepInfo: {}
    };
  }
}

/**
 * Get steps for a specific quest chain
 * @param {string} chainId - Chain ID
 * @returns {Promise<Array>} - Chain steps
 */
export async function getQuestChainSteps(chainId) {
  try {
    const { data, error } = await supabase
      .from('quest_chain_steps')
      .select('*')
      .eq('chain_id', chainId)
      .order('step_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching quest chain steps:', error);
    return [];
  }
}

/**
 * Get difficulty color class
 * @param {string} difficulty - Difficulty level
 * @returns {string} - Tailwind color class
 */
export function getDifficultyColor(difficulty) {
  const colors = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-red-400',
    epic: 'text-purple-400'
  };
  return colors[difficulty] || colors.medium;
}

/**
 * Get category info
 * @param {string} category - Category name
 * @returns {Object} - Category icon and display name
 */
export function getCategoryInfo(category) {
  const categories = {
    personal_growth: { icon: '🌱', name: 'Personal Growth' },
    adventure: { icon: '⚔️', name: 'Adventure' },
    mastery: { icon: '🔥', name: 'Mastery' },
    social: { icon: '🤝', name: 'Social' },
    mystery: { icon: '🔍', name: 'Mystery' }
  };
  return categories[category] || { icon: '📜', name: 'Quest Chain' };
}
