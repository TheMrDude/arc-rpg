import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/founder-status
 *
 * Public, unauthenticated. Returns the LIVE number of Founders Lifetime spots
 * left, read straight from founder_inventory — never hardcoded. Both pricing
 * surfaces use this to render (or hide) the Founders card and its counter.
 *
 * Uses the service-role client because founder_inventory is not anon-readable
 * (RLS). Only a single integer count is exposed, nothing sensitive.
 */
export async function GET() {
  const TOTAL = 25;
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('founder_inventory')
      .select('remaining')
      .eq('id', 'founder')
      .single();

    if (error) {
      console.error('founder-status: inventory read failed', error.message);
      // Fail closed: hide the offer rather than risk overselling on a read error.
      return NextResponse.json(
        { remaining: 0, total: TOTAL, available: false },
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const remaining = Math.max(0, data?.remaining ?? 0);
    return NextResponse.json(
      { remaining, total: TOTAL, available: remaining > 0 },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('founder-status error:', err);
    return NextResponse.json(
      { remaining: 0, total: TOTAL, available: false },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
