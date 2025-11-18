import { SupabaseClient } from '@supabase/supabase-js';

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  total_uses: number;
  total_rewards_earned: number;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  completed: boolean;
  reward_granted: boolean;
  created_at: string;
  completed_at?: string;
}

/**
 * Get user's referral code
 */
export async function getUserReferralCode(
  userId: string,
  supabase: SupabaseClient
): Promise<ReferralCode | null> {
  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching referral code:', error);
    return null;
  }

  return data;
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalXpEarned: number;
  code: string;
}> {
  // Get referral code
  const codeData = await getUserReferralCode(userId, supabase);

  if (!codeData) {
    return {
      totalReferrals: 0,
      completedReferrals: 0,
      pendingReferrals: 0,
      totalXpEarned: 0,
      code: '',
    };
  }

  // Get referral records
  const { data: referrals, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId);

  if (error) {
    console.error('Error fetching referrals:', error);
  }

  const completed = referrals?.filter((r) => r.completed).length || 0;
  const pending = referrals?.filter((r) => !r.completed).length || 0;

  return {
    totalReferrals: codeData.total_uses,
    completedReferrals: completed,
    pendingReferrals: pending,
    totalXpEarned: codeData.total_rewards_earned,
    code: codeData.code,
  };
}

/**
 * Apply referral code during signup
 */
export async function applyReferralCode(
  referralCode: string,
  newUserId: string,
  supabase: SupabaseClient
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate referral code exists
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', referralCode.toUpperCase())
      .single();

    if (codeError || !codeData) {
      return { success: false, message: 'Invalid referral code' };
    }

    // Don't allow self-referral
    if (codeData.user_id === newUserId) {
      return { success: false, message: 'Cannot use your own referral code' };
    }

    // Create referral record
    const { error: referralError } = await supabase.from('referrals').insert({
      referrer_id: codeData.user_id,
      referred_id: newUserId,
      referral_code: referralCode.toUpperCase(),
    });

    if (referralError) {
      console.error('Error creating referral:', referralError);
      return { success: false, message: 'Failed to apply referral code' };
    }

    // Update referred user's profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referred_by_code: referralCode.toUpperCase() })
      .eq('id', newUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return { success: true, message: 'Referral code applied successfully!' };
  } catch (error) {
    console.error('Error in applyReferralCode:', error);
    return { success: false, message: 'Something went wrong' };
  }
}

/**
 * Mark referral as completed (called when referred user completes first quest)
 */
export async function completeReferral(
  referredUserId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    // Call the database function to process the referral
    const { error } = await supabase.rpc('process_completed_referral', {
      referred_user_id: referredUserId,
    });

    if (error) {
      console.error('Error processing referral:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in completeReferral:', error);
    return false;
  }
}

/**
 * Track quest share on social media
 */
export async function trackQuestShare(
  userId: string,
  questId: string,
  platform: 'twitter' | 'facebook' | 'linkedin' | 'copy_link',
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase.from('quest_shares').insert({
      user_id: userId,
      quest_id: questId,
      platform,
    });

    if (error) {
      console.error('Error tracking quest share:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in trackQuestShare:', error);
    return false;
  }
}

/**
 * Generate shareable URLs for quest achievements
 */
export function generateShareUrls(questTitle: string, level: number, xpGained: number) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://habitquest.dev';
  const shareText = `Just completed "${questTitle}" and earned ${xpGained} XP! 🎮 Level ${level} in HabitQuest - turning life into an epic RPG! ⚔️`;
  const hashtags = 'HabitQuest,Gamification,Productivity';

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&hashtags=${hashtags}&url=${baseUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${baseUrl}&quote=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${baseUrl}`,
    copyText: shareText,
  };
}

/**
 * Generate referral link for user
 */
export function generateReferralLink(referralCode: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://habitquest.dev';
  return `${baseUrl}/signup?ref=${referralCode}`;
}
