import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const { quest_id, is_active, recurrence_type, recurrence_interval } = await request.json();

    if (!quest_id) {
      return NextResponse.json({ error: 'Quest ID required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Build update object
    const updates = {};
    if (typeof is_active === 'boolean') {
      updates.is_active = is_active;
      // When resuming, clear last_generated_at so cron generates immediately
      if (is_active) {
        updates.last_generated_at = null;
      }
    }
    if (recurrence_type && ['daily', 'weekly', 'custom'].includes(recurrence_type)) {
      updates.recurrence_type = recurrence_type;
    }
    if (recurrence_interval && recurrence_interval >= 2 && recurrence_interval <= 30) {
      updates.recurrence_interval = recurrence_interval;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: quest, error: updateError } = await supabaseAdmin
      .from('recurring_quests')
      .update(updates)
      .eq('id', quest_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !quest) {
      console.error('Error updating recurring quest:', updateError);
      return NextResponse.json({ error: 'Failed to update recurring quest' }, { status: 500 });
    }

    return NextResponse.json({ success: true, quest });
  } catch (error) {
    console.error('Recurring quest update error:', error);
    return NextResponse.json({ error: 'Failed to update recurring quest' }, { status: 500 });
  }
}
