import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.id;

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const isDM = campaign.dm_user_id === user.id;
    if (!isDM) {
      const { data: membership } = await supabaseAdmin
        .from('party_members')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from('party_members')
      .select('user_id, character_name, character_class, status')
      .eq('campaign_id', campaignId)
      .eq('status', 'active');

    if (membersError) {
      console.error('Error fetching party members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch party' }, { status: 500 });
    }

    const memberList = members || [];
    if (memberList.length === 0) {
      return NextResponse.json({ party: [], campaign });
    }

    // Fetch profiles separately (safer than FK join)
    const userIds = memberList.map(m => m.user_id);
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, level, xp, archetype')
      .in('id', userIds);

    const profileMap = {};
    (profiles || []).forEach(p => { profileMap[p.id] = p; });

    // Fetch recent quests for each member in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const partyWithQuests = await Promise.all(
      memberList.map(async (member) => {
        const { data: recentQuests } = await supabaseAdmin
          .from('quests')
          .select('transformed_text, completed_at, xp_value')
          .eq('user_id', member.user_id)
          .eq('completed', true)
          .gte('completed_at', sevenDaysAgo)
          .order('completed_at', { ascending: false })
          .limit(10);

        return {
          user_id: member.user_id,
          character_name: member.character_name,
          character_class: member.character_class,
          status: member.status,
          profile: profileMap[member.user_id] || null,
          recent_quests: recentQuests || [],
          active_this_week: (recentQuests || []).length > 0,
        };
      })
    );

    return NextResponse.json({ party: partyWithQuests, campaign });
  } catch (error) {
    console.error('Party fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
