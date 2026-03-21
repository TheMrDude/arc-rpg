import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isPro: boolean;
}

/**
 * Check a user's subscription tier from their profile.
 * Use on the client side with the user's Supabase client.
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionStatus> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, is_premium')
    .eq('id', userId)
    .single();

  const tier: SubscriptionTier =
    data?.subscription_tier === 'pro' && data?.subscription_status === 'active'
      ? 'pro'
      : 'free';

  return { tier, isPro: tier === 'pro' };
}

/**
 * Feature gate — returns true if user has access to a Pro feature.
 * Use this to conditionally render or guard Pro-only features.
 */
export function requiresPro(tier: SubscriptionTier): boolean {
  return tier !== 'pro';
}

// Pro feature limits for free tier
export const FREE_TIER_LIMITS = {
  maxHabits: 3,
  hasBossBattles: false,
  hasEquipmentShop: false,
  hasQuestChains: false,
  hasJournal: false,
  hasWeeklyDigest: false,
} as const;

export const PRO_TIER_LIMITS = {
  maxHabits: Infinity,
  hasBossBattles: true,
  hasEquipmentShop: true,
  hasQuestChains: true,
  hasJournal: true,
  hasWeeklyDigest: true,
} as const;

export function getTierLimits(tier: SubscriptionTier) {
  return tier === 'pro' ? PRO_TIER_LIMITS : FREE_TIER_LIMITS;
}
