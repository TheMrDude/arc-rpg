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

    const { campaign_id } = await request.json();
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('dm_user_id', user.id)
      .single();

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or unauthorized' }, { status: 404 });
    }

    // Fetch party members
    const { data: members } = await supabaseAdmin
      .from('party_members')
      .select('user_id, character_name, character_class')
      .eq('campaign_id', campaign_id)
      .eq('status', 'active');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const partyActivity = await Promise.all(
      (members || []).map(async (member) => {
        const { data: quests } = await supabaseAdmin
          .from('quests')
          .select('transformed_text')
          .eq('user_id', member.user_id)
          .eq('completed', true)
          .gte('completed_at', sevenDaysAgo)
          .limit(10);

        return {
          character_name: member.character_name,
          character_class: member.character_class,
          recent_quests: quests || [],
        };
      })
    );

    const systemPrompt = `You are a master Dungeon Master narrating the opening of a D&D session.
You will receive a list of what each character did during the week between sessions.
Write a vivid 2-3 paragraph opening narration that:
- Sets the scene at the start of the new session
- Weaves in references to what each character was doing between sessions
- Creates narrative momentum and pulls the party into the next adventure
- Uses rich fantasy language in the style of Tolkien
- Ends on a hook or sense of incoming drama
Reference characters by name. Write pure narrative prose, no bullet points.`;

    const userPrompt = `Campaign: ${campaign.name} in ${campaign.world_name}
Session: ${campaign.current_session + 1}

Party downtime this week:
${partyActivity.map(p => `${p.character_name} (${p.character_class}): ${p.recent_quests.map(q => q.transformed_text).join(', ') || 'No activity recorded'}`).join('\n')}

Write the session opening narration.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const narrative = message.content[0]?.text || '';

    return NextResponse.json({ narrative });
  } catch (error) {
    console.error('Generate intro error:', error);
    return NextResponse.json({ error: 'Failed to generate intro' }, { status: 500 });
  }
}
