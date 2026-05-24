import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { npc_id, scenario } = await request.json();

    if (!npc_id || !scenario?.trim()) {
      return NextResponse.json({ error: 'npc_id and scenario are required' }, { status: 400 });
    }

    const { data: npc } = await supabaseAdmin
      .from('npc_library')
      .select('*')
      .eq('id', npc_id)
      .single();

    if (!npc) {
      return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
    }

    // Verify the DM owns this campaign
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('dm_user_id')
      .eq('id', npc.campaign_id)
      .single();

    if (!campaign || campaign.dm_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const systemPrompt = `You are voicing an NPC in a D&D campaign.
Voice description: ${npc.ai_voice_description || 'Unknown voice style'}
Personality: ${npc.personality || 'Unknown personality'}
Relationship to party: ${npc.relationship_to_party || 'Unknown'}
Status: ${npc.status}
Current location: ${npc.current_location || 'Unknown'}

Generate 4-6 lines of dialogue this NPC might say in the given scenario.
Make the voice distinct and consistent. Include speech mannerisms and quirks.
Format each line as: "${npc.name}: [dialogue]"`;

    const userPrompt = `Scenario: ${scenario}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const dialogue = message.content[0]?.text || '';

    return NextResponse.json({ dialogue, npc_name: npc.name });
  } catch (error) {
    console.error('NPC dialogue error:', error);
    return NextResponse.json({ error: 'Failed to generate dialogue' }, { status: 500 });
  }
}
