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

    const { campaign_id, title, dm_notes, attending_players } = await request.json();

    if (!campaign_id || !dm_notes?.trim()) {
      return NextResponse.json({ error: 'campaign_id and dm_notes are required' }, { status: 400 });
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

    const sessionNumber = (campaign.current_session || 0) + 1;
    const partyNames = (attending_players || []).join(', ') || 'the party';

    const systemPrompt = `You are the chronicler of a heroic D&D campaign.
Write a full narrative session recap from the DM's bullet-point notes.
- 3-5 paragraphs, third-person perspective
- Reference player characters by name
- Make it feel legendary, like a chapter from a fantasy novel
- End with a cliffhanger or sense of what comes next
Pure narrative prose only.`;

    const userPrompt = `Campaign: ${campaign.name} in ${campaign.world_name}
Session ${sessionNumber}${title ? `: ${title}` : ''}
Players present: ${partyNames}

DM's notes:
${dm_notes}

Write the session chronicle.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const ai_narrative = message.content[0]?.text || '';

    // Save to session_logs
    const { data: sessionLog, error: logError } = await supabaseAdmin
      .from('session_logs')
      .insert({
        campaign_id,
        session_number: sessionNumber,
        title: title?.trim() || `Session ${sessionNumber}`,
        dm_notes: dm_notes.trim(),
        ai_narrative,
        session_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      console.error('Error saving session log:', logError);
    }

    // Increment current_session on the campaign
    await supabaseAdmin
      .from('campaigns')
      .update({ current_session: sessionNumber })
      .eq('id', campaign_id);

    return NextResponse.json({
      session_id: sessionLog?.id,
      ai_narrative,
      session_number: sessionNumber,
    });
  } catch (error) {
    console.error('Session recap error:', error);
    return NextResponse.json({ error: 'Failed to generate recap' }, { status: 500 });
  }
}
