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

    const { quest_id, is_active } = await request.json();

    if (!quest_id) {
      return NextResponse.json({ error: 'Quest ID required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Verify ownership and update
    const { data: quest, error: updateError } = await supabaseAdmin
      .from('recurring_quests')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quest_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !quest) {
      console.error('Error updating recurring quest:', updateError);
      return NextResponse.json({ error: 'Failed to update recurring quest' }, { status: 500 });
    }

    console.log('Recurring quest updated:', {
      userId: user.id,
      questId: quest_id,
      isActive: is_active,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, quest });
  } catch (error) {
    console.error('Recurring quest update error:', error);
    return NextResponse.json({ error: 'Failed to update recurring quest' }, { status: 500 });
  }
}
