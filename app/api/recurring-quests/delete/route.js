import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Authenticate user
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { quest_id } = await request.json();

    if (!quest_id) {
      return NextResponse.json({ error: 'Quest ID required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Delete recurring quest (verify ownership)
    const { error: deleteError } = await supabaseAdmin
      .from('recurring_quests')
      .delete()
      .eq('id', quest_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting recurring quest:', deleteError);
      return NextResponse.json({ error: 'Failed to delete recurring quest' }, { status: 500 });
    }

    console.log('Recurring quest deleted:', {
      userId: user.id,
      questId: quest_id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recurring quest delete error:', error);
    return NextResponse.json({ error: 'Failed to delete recurring quest' }, { status: 500 });
  }
}
