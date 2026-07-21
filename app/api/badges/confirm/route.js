import { NextResponse } from 'next/server';
import { authenticateRequest, getSupabaseAdmin } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/badges/confirm
 * Records a successful on-chain mint against the user's badge_claims row.
 * Called by the claim flow after the mint transaction confirms.
 *
 * badge_claims is service-role-only for writes (RLS blocks the client), so
 * this authenticates the user, then writes with the admin client — scoped to
 * that user's own row.
 */
export async function POST(request) {
  const { user, error: authError } = await authenticateRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const badgeId = Number(body.badge_id);
  if (!Number.isInteger(badgeId) || badgeId < 1 || badgeId > 5) {
    return NextResponse.json({ error: 'Invalid badge_id' }, { status: 400 });
  }

  const txHash = String(body.tx_hash || '').trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'Invalid tx_hash' }, { status: 400 });
  }

  // token_id is optional (may not be parsed client-side); store as string if present.
  const tokenId =
    body.token_id === undefined || body.token_id === null ? null : String(body.token_id);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('badge_claims')
    .update({
      status: 'claimed',
      tx_hash: txHash,
      token_id: tokenId,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('badge_id', badgeId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('badge confirm failed:', error);
    return NextResponse.json({ error: 'Could not record claim' }, { status: 500 });
  }

  if (!data) {
    // No voucher was ever issued for this user+badge — nothing to confirm.
    return NextResponse.json({ error: 'No claim to confirm' }, { status: 404 });
  }

  return NextResponse.json({ success: true, claim: data });
}
