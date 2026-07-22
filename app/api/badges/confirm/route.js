import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { authenticateRequest, getSupabaseAdmin } from '@/lib/api-auth';
import {
  BADGE_CONTRACT_ADDRESS,
  badgeChain,
  HABITQUEST_BADGES_ABI,
} from '@/lib/badge-contract';

export const dynamic = 'force-dynamic';

/**
 * POST /api/badges/confirm
 * Records a successful on-chain mint against the user's badge_claims row.
 *
 * SECURITY: the claimed state is only ever set after verifying ON-CHAIN that
 * the badge was actually minted to the wallet of record (contract
 * hasClaimed[wallet][badgeId] == true). We never trust the client's tx_hash as
 * proof — a fabricated hash cannot flip the row to 'claimed'. badge_claims is
 * service-role-only for writes (RLS blocks the client); this authenticates the
 * user, then writes their own row with the admin client.
 */
export async function POST(request) {
  // Require a Bearer token (mitigates CSRF on this state-changing write; the
  // claim flow always sends the Supabase access token).
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // token_id is optional; if present it must look like a uint256 (LOW-2).
  let tokenId = null;
  if (body.token_id !== undefined && body.token_id !== null) {
    tokenId = String(body.token_id);
    if (!/^\d{1,78}$/.test(tokenId)) {
      return NextResponse.json({ error: 'Invalid token_id' }, { status: 400 });
    }
  }

  if (!BADGE_CONTRACT_ADDRESS) {
    return NextResponse.json({ error: 'Badge contract not configured' }, { status: 503 });
  }

  const admin = getSupabaseAdmin();

  // The wallet of record is the one we issued the voucher to. We verify the
  // mint against THIS wallet, not any client-supplied address.
  const { data: claim } = await admin
    .from('badge_claims')
    .select('wallet_address, status')
    .eq('user_id', user.id)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (!claim) {
    return NextResponse.json({ error: 'No claim to confirm' }, { status: 404 });
  }
  if (claim.status === 'claimed') {
    return NextResponse.json({ success: true, already: true });
  }

  // Verify the mint on-chain: the contract must report the badge as claimed by
  // the wallet of record. A forged tx_hash cannot satisfy this.
  try {
    const client = createPublicClient({ chain: badgeChain, transport: http() });
    const minted = await client.readContract({
      address: BADGE_CONTRACT_ADDRESS,
      abi: HABITQUEST_BADGES_ABI,
      functionName: 'hasClaimed',
      args: [claim.wallet_address, BigInt(badgeId)],
    });
    if (minted !== true) {
      return NextResponse.json(
        { error: 'Mint not confirmed on-chain', code: 'not_minted' },
        { status: 409 }
      );
    }
  } catch (err) {
    console.error('badge confirm on-chain check failed:', err?.message);
    return NextResponse.json({ error: 'Could not verify mint' }, { status: 502 });
  }

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

  return NextResponse.json({ success: true, claim: data });
}
