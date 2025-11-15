import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
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

    // Fetch recurring quests
    const { data: quests, error: fetchError } = await supabaseAdmin
      .from('recurring_quests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching recurring quests:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch recurring quests' }, { status: 500 });
    }

    return NextResponse.json({ success: true, quests: quests || [] });
  } catch (error) {
    console.error('Recurring quests list error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring quests' }, { status: 500 });
  }
}
