import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      console.error('Journal delete: Authentication failed', {
        error: authError,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // First verify the entry belongs to the user
    const { data: entry, error: fetchError } = await supabaseAdmin
      .from('journal_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .single();

    if (fetchError || !entry) {
      console.error('Journal delete: Entry not found', {
        entryId,
        error: fetchError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Security check: Ensure user owns this entry
    if (entry.user_id !== user.id) {
      console.error('Journal delete: Unauthorized access attempt', {
        userId: user.id,
        entryUserId: entry.user_id,
        entryId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized to delete this entry' }, { status: 403 });
    }

    // Delete the entry
    const { error: deleteError } = await supabaseAdmin
      .from('journal_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id); // Double check ownership

    if (deleteError) {
      console.error('Journal delete: Database error', {
        error: deleteError.message,
        userId: user.id,
        entryId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Failed to delete journal entry' }, { status: 500 });
    }

    console.log('Journal entry deleted successfully', {
      userId: user.id,
      entryId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully',
    });
  } catch (error) {
    console.error('Journal delete: Unexpected error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}
