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

    const supabaseAdmin = getSupabaseAdminClient();

    // Check if user is premium
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium')
      .eq('id', user.id)
      .single();

    if (!profile?.is_premium) {
      return NextResponse.json(
        { error: 'Premium feature - upgrade to access recurring quests' },
        { status: 403 }
      );
    }

    const {
      original_text,
      transformed_text,
      difficulty,
      xp_value,
      recurrence_type,
      recurrence_interval,
      recurrence_day_of_week,
      is_active,
    } = await request.json();

    // Validate inputs
    if (!original_text || !transformed_text || !difficulty || !xp_value || !recurrence_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    if (!['daily', 'weekly', 'custom'].includes(recurrence_type)) {
      return NextResponse.json({ error: 'Invalid recurrence type' }, { status: 400 });
    }

    // Insert recurring quest
    const { data: recurringQuest, error: insertError } = await supabaseAdmin
      .from('recurring_quests')
      .insert({
        user_id: user.id,
        original_text: original_text.substring(0, 200),
        transformed_text: transformed_text.substring(0, 500),
        difficulty,
        xp_value,
        recurrence_type,
        recurrence_interval: recurrence_interval || 1,
        recurrence_day_of_week,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating recurring quest:', insertError);
      return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
    }

    console.log('Recurring quest created:', {
      userId: user.id,
      questId: recurringQuest.id,
      recurrenceType: recurrence_type,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, quest: recurringQuest });
  } catch (error) {
    console.error('Recurring quest creation error:', error);
    return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
  }
}
