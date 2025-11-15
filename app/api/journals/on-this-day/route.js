import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('On This Day: Authentication failed', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Call the database function to get "On This Day" entries
    const { data: entries, error: fetchError } = await supabaseAdmin
      .rpc('get_on_this_day_entries', { p_user_id: user.id });

    if (fetchError) {
      console.error('On This Day: Database error', {
        error: fetchError.message,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to fetch "On This Day" entries' }, { status: 500 });
    }

    console.log('On This Day entries fetched successfully', {
      userId: user.id,
      count: entries?.length || 0,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      entries: entries || [],
    });
  } catch (error) {
    console.error('On This Day: Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to fetch "On This Day" entries' },
      { status: 500 }
    );
  }
}
