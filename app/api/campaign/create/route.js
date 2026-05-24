import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, world_name, description } = await request.json();

    if (!name?.trim() || !world_name?.trim()) {
      return NextResponse.json({ error: 'name and world_name are required' }, { status: 400 });
    }

    // Generate a unique invite code
    let invite_code = null;
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidate = generateInviteCode();
      const { data: existing } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('invite_code', candidate)
        .maybeSingle();
      if (!existing) {
        invite_code = candidate;
        break;
      }
    }

    if (!invite_code) {
      return NextResponse.json({ error: 'Failed to generate unique invite code' }, { status: 500 });
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        dm_user_id: user.id,
        name: name.trim(),
        world_name: world_name.trim(),
        description: description?.trim() || null,
        invite_code,
        status: 'active',
        current_session: 0,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    await supabaseAdmin
      .from('profiles')
      .update({ active_campaign_id: campaign.id, campaign_role: 'dm' })
      .eq('id', user.id);

    return NextResponse.json({
      campaign_id: campaign.id,
      invite_code: campaign.invite_code,
      invite_url: `https://habitquest.dev/campaign/join?code=${campaign.invite_code}`,
    });
  } catch (error) {
    console.error('Campaign create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
