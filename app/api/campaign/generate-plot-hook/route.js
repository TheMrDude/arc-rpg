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

    // Get most recent session log
    const { data: recentSession } = await supabaseAdmin
      .from('session_logs')
      .select('title, ai_narrative, key_events')
      .eq('campaign_id', campaign_id)
      .order('session_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get party members and recent activity
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
          .limit(5);

        return {
          character_name: member.character_name,
          recent_quests: (quests || []).map(q => q.transformed_text),
        };
      })
    );

    const systemPrompt = `You are a master Dungeon Master generating a plot hook.
Based on the campaign context and what the party has been doing,
create one compelling plot hook (2-3 sentences) that:
- Feels like a natural consequence of recent events
- Creates urgency or mystery
- Could launch the next session
Be specific, not generic. Reference the world name and character actions.`;

    const recentContext = recentSession
      ? `Most recent session: ${recentSession.title}\n${recentSession.ai_narrative?.substring(0, 400) || ''}`
      : 'No previous sessions yet.';

    const userPrompt = `Campaign: ${campaign.name}
World: ${campaign.world_name}
Current session number: ${campaign.current_session}

${recentContext}

Recent party activity:
${partyActivity.map(p => `${p.character_name}: ${p.recent_quests.join(', ') || 'No recent activity'}`).join('\n')}

Generate a plot hook for the next session.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const plot_hook = message.content[0]?.text || '';

    return NextResponse.json({ plot_hook });
  } catch (error) {
    console.error('Plot hook error:', error);
    return NextResponse.json({ error: 'Failed to generate plot hook' }, { status: 500 });
  }
}
