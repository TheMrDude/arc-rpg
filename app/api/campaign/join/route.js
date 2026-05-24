import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invite_code, character_name } = await request.json();

    if (!invite_code?.trim() || !character_name?.trim()) {
      return NextResponse.json({ error: 'invite_code and character_name are required' }, { status: 400 });
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('invite_code', invite_code.trim().toUpperCase())
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    if (campaign.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not currently active' }, { status: 400 });
    }

    // Get user's archetype for character_class
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('archetype')
      .eq('id', user.id)
      .single();

    // Check if already a member
    const { data: existingMember } = await supabaseAdmin
      .from('party_members')
      .select('id')
      .eq('campaign_id', campaign.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existingMember) {
      const { error: memberError } = await supabaseAdmin
        .from('party_members')
        .insert({
          campaign_id: campaign.id,
          user_id: user.id,
          character_name: character_name.trim(),
          character_class: profile?.archetype || 'adventurer',
          status: 'active',
        });

      if (memberError) {
        console.error('Error adding party member:', memberError);
        return NextResponse.json({ error: 'Failed to join campaign' }, { status: 500 });
      }
    }

    await supabaseAdmin
      .from('profiles')
      .update({ active_campaign_id: campaign.id, campaign_role: 'player' })
      .eq('id', user.id);

    return NextResponse.json({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      world_name: campaign.world_name,
    });
  } catch (error) {
    console.error('Campaign join error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
