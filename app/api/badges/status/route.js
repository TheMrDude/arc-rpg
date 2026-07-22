import { NextResponse } from 'next/server';
import { authenticateRequest, getSupabaseAdmin } from '@/lib/api-auth';
import {
  BADGES,
  playerDataFromProfile,
  isBadgeEarned,
  badgeProgress,
} from '@/lib/badges';

export const dynamic = 'force-dynamic';

/**
 * GET /api/badges/status
 * Authoritative per-badge state for the signed-in user, so the gallery does
 * not have to re-derive milestone logic client-side (and dodges RLS on
 * weekly_boss_battles). Mirrors the Edge Function's eligibility checks.
 */
export async function GET(request) {
  const { user, error: authError } = await authenticateRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const [{ data: profile }, { count: bossWins }, { data: claims }] = await Promise.all([
    admin
      .from('profiles')
      .select('quests_completed, longest_streak, level, story_progress')
      .eq('id', user.id)
      .single(),
    admin
      .from('weekly_boss_battles')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'defeated'),
    admin
      .from('badge_claims')
      .select('badge_id, status, tx_hash, wallet_address')
      .eq('user_id', user.id),
  ]);

  const playerData = playerDataFromProfile(profile || {}, { bossWon: (bossWins || 0) > 0 });
  const claimByBadge = new Map((claims || []).map((c) => [c.badge_id, c]));

  const badges = BADGES.map((b) => {
    const claim = claimByBadge.get(b.id);
    return {
      id: b.id,
      key: b.key,
      earned: isBadgeEarned(b.id, playerData),
      claimed: claim?.status === 'claimed',
      tx_hash: claim?.tx_hash || null,
      progress: badgeProgress(b.id, playerData),
    };
  });

  return NextResponse.json({ badges });
}
