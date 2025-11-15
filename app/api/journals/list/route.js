import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('Journal list: Authentication failed', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const supabaseAdmin = getSupabaseAdminClient();

    // Fetch journal entries for the user
    const { data: entries, error: fetchError, count } = await supabaseAdmin
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error('Journal list: Database error', {
        error: fetchError.message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
    }

    console.log('Journal entries fetched successfully', {
      userId: user.id,
      count: entries?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      entries: entries || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Journal list: Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}
