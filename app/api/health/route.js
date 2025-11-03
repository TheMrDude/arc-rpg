export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Check database connection and count founder spots
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');

    if (error) {
      throw new Error(error.message);
    }

    const remaining = Math.max(0, 25 - (count || 0));

    return NextResponse.json({
      ok: true,
      remaining,
      claimed: count || 0,
      total: 25,
      timestamp: new Date().toISOString()
    });

  } catch (e) {
    console.error('Health check error:', e.message);
    return NextResponse.json({
      ok: false,
      error: e.message
    }, { status: 500 });
  }
}
