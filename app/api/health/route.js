export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // Check founder_inventory table
    const { data, error } = await supabaseAdmin
      .from('founder_inventory')
      .select('remaining')
      .eq('id', 'founder')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      remaining: data?.remaining ?? 0,
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
