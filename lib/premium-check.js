/**
 * CENTRALIZED PREMIUM CHECK
 *
 * Use this helper to consistently check if a user has premium access.
 * This prevents inconsistencies across the codebase.
 */

/**
 * Check if a user has premium access
 * @param {Object} profile - User profile object from database
 * @returns {boolean} - True if user has premium access
 */
export function isPremium(profile) {
  if (!profile) return false;

  // User is premium if EITHER:
  // 1. They have an active subscription (Stripe)
  // 2. They have the is_premium flag set (manual grant, founder, etc.)
  return profile.subscription_status === 'active' || profile.is_premium === true;
}

/**
 * Check if a user is an admin
 * @param {Object} profile - User profile object from database
 * @returns {boolean} - True if user has admin access
 */
export function isAdmin(profile) {
  if (!profile) return false;
  return profile.is_admin === true;
}

/**
 * Require premium access (for server-side use)
 * @param {Object} profile - User profile object
 * @throws {Error} - Throws if user is not premium
 */
export function requirePremium(profile) {
  if (!isPremium(profile)) {
    throw new Error('Premium access required');
  }
}

/**
 * Require admin access (for server-side use)
 * @param {Object} profile - User profile object
 * @throws {Error} - Throws if user is not admin
 */
export function requireAdminAccess(profile) {
  if (!isAdmin(profile)) {
    throw new Error('Admin access required');
  }
}
