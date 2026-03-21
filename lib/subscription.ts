import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isPro: boolean;
  inTrial: boolean;
  trialDaysRemaining: number;
}

/**
 * Check if a profile is currently in an active trial period.
 */
export function isInTrial(profile: { trial_ends_at?: string | null }): boolean {
  if (!profile?.trial_ends_at) return false;
  return new Date(profile.trial_ends_at) > new Date();
}

/**
 * Get the number of days remaining in the trial (0 if expired or no trial).
 */
export function getTrialDaysRemaining(profile: { trial_ends_at?: string | null }): number {
  if (!profile?.trial_ends_at) return 0;
  const remaining = new Date(profile.trial_ends_at).getTime() - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (1000 * 60 * 60 * 24));
}

/**
 * Start a 7-day Pro trial for a user. Sets trial_ends_at to 7 days from now.
 */
export async function startTrial(
  supabase: SupabaseClient,
  userId: string
): Promise<{ trial_ends_at: string }> {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  const trialEndsAt = trialEnd.toISOString();

  await supabase
    .from('profiles')
    .update({
      trial_ends_at: trialEndsAt,
      subscription_tier: 'pro',
    })
    .eq('id', userId);

  return { trial_ends_at: trialEndsAt };
}

/**
 * Check a user's subscription tier from their profile.
 * Use on the client side with the user's Supabase client.
 * Trial users are treated as Pro.
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionStatus> {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, is_premium, trial_ends_at')
    .eq('id', userId)
    .single();

  const inTrial = isInTrial(data ?? {});
  const trialDaysRemaining = getTrialDaysRemaining(data ?? {});

  const tier: SubscriptionTier =
    (data?.subscription_tier === 'pro' && data?.subscription_status === 'active') || inTrial
      ? 'pro'
      : 'free';

  return { tier, isPro: tier === 'pro', inTrial, trialDaysRemaining };
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
