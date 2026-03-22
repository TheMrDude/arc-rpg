import { NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Check premium status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

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

    const activeCount = (quests || []).filter(q => q.is_active).length;

    return NextResponse.json({
      success: true,
      recurring_quests: quests || [],
      count: activeCount,
      limit: isPremium ? null : 3,
      is_premium: isPremium,
    });
  } catch (error) {
    console.error('Recurring quests list error:', error);
    return NextResponse.json({ error: 'Failed to fetch recurring quests' }, { status: 500 });
  }
}
