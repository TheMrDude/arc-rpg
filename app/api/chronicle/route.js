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

const ARCHETYPE_TONE = {
  warrior: 'bold and driving',
  builder: 'steady and grounded',
  sage: 'thoughtful and wry',
  shadow: 'quiet and cool',
  seeker: 'curious and bright',
};

/**
 * GET /api/chronicle — the DM's "story so far." Weaves the player's most
 * recent deeds (crossroads, boss battles, journeys, quests — all already
 * logged in story_progress.recent_events) into one short flowing saga in
 * the Dungeon Master's voice. This is the evergreen narration that sits
 * atop the dashboard; the big weekly chapter lives in /api/weekly-summary.
 *
 * Stateless: no DB writes. The client caches the result per day so this
 * generates at most once a day per player.
 */
export async function GET(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('story_progress, archetype')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const events = (profile.story_progress?.recent_events || []).filter(Boolean);

    // Not enough history to narrate yet — the panel falls back to the raw line.
    if (events.length < 2) {
      return NextResponse.json({ text: null });
    }

    const archetype = profile.archetype || 'seeker';
    const tone = ARCHETYPE_TONE[archetype] || ARCHETYPE_TONE.seeker;
    const deeds = events.slice(0, 6);

    let text = null;
    try {
      const systemPrompt = `You are the Dungeon Master of HabitQuest narrating a hero's "story so far" — a warm, ${tone} recap of their recent deeds on the road.

RULES:
- 2 to 3 sentences. One short paragraph. No lists.
- Weave the deeds into ONE flowing little saga, in past tense, second person ("you"). Do not just restate them.
- This is a guilt-free world. NEVER mention streaks, missed days, failure, or shame. Quiet stretches are simply rest.
- Warm, whimsical, grounded. End on gentle forward momentum, like the road still stretches ahead.
- Return only the recap text, no preamble, no quotes.`;

      const userPrompt = `The hero is a ${archetype}. Their most recent deeds, newest first:
${deeds.map((d) => `- ${d}`).join('\n')}

Write their story so far.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        thinking: { type: 'disabled' },
        max_tokens: 220,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      text = (message.content?.[0]?.text || '').trim() || null;
    } catch (aiErr) {
      console.error('Chronicle generation failed:', aiErr);
      // Graceful fallback: the single most recent deed, unnarrated.
      text = events[0] || null;
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Chronicle error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
