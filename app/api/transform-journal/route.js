import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    // SECURE: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Transform journal: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Transform journal: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entry_text, mood, archetype } = await request.json();

    // SECURE: Input validation
    if (!entry_text || typeof entry_text !== 'string') {
      return NextResponse.json({ error: 'Invalid entry text' }, { status: 400 });
    }

    if (entry_text.length < 50) {
      return NextResponse.json({ error: 'Entry must be at least 50 characters' }, { status: 400 });
    }

    if (entry_text.length > 2000) {
      return NextResponse.json({ error: 'Entry text too long (max 2000 characters)' }, { status: 400 });
    }

    if (entry_text.trim().length === 0) {
      return NextResponse.json({ error: 'Entry text cannot be empty' }, { status: 400 });
    }

    const validArchetypes = ['warrior', 'builder', 'shadow', 'sage', 'seeker'];
    if (!archetype || !validArchetypes.includes(archetype)) {
      return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
    }

    // SECURE: Sanitize input (remove potentially harmful characters)
    const sanitizedEntry = entry_text
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();

    // Load user profile and story state for continuity
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, story_chapter, story_last_event, level')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';
    const storyChapter = profile?.story_chapter || 0;
    const storyArc = Math.floor(storyChapter / 4); // 4 chapters per arc

    // Check daily transformation limit (10 per day for rate limiting)
    const { data: todayCount } = await supabaseAdmin
      .from('journal_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('transformed_narrative', 'is', null)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    if (todayCount && todayCount.length >= 10 && !isPremium) {
      return NextResponse.json(
        { error: 'Daily transformation limit reached (10 per day). Try again tomorrow or upgrade to Premium for unlimited transformations.' },
        { status: 429 }
      );
    }

    // Fetch recent journal entries for emotional continuity
    const { data: recentEntries } = await supabaseAdmin
      .from('journal_entries')
      .select('transformed_narrative, mood, created_at')
      .eq('user_id', user.id)
      .not('transformed_narrative', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    const recentContext = recentEntries && recentEntries.length > 0
      ? `\n\nRECENT REFLECTIONS (for continuity):\n${recentEntries.map(e => `- ${e.transformed_narrative} (mood: ${e.mood || 'neutral'})`).join('\n')}\n\nCreate subtle continuity with these recent reflections if appropriate.`
      : '';

    const archetypeVoices = {
      warrior: 'determined, courageous, action-oriented - frames struggles as battles to overcome',
      builder: 'pragmatic, constructive, steady - frames challenges as projects to build through',
      shadow: 'introspective, strategic, deep - frames emotions as inner landscapes to navigate',
      sage: 'wise, reflective, philosophical - frames experiences as lessons and growth',
      seeker: 'curious, adventurous, open - frames life as an ongoing journey of discovery',
    };

    const moodContext = mood
      ? `Current mood: ${mood}/5 (${mood === 1 ? 'struggling' : mood === 2 ? 'difficult' : mood === 3 ? 'neutral' : mood === 4 ? 'good' : 'thriving'})`
      : 'Mood not specified';

    const prompt = `You are transforming a user's personal journal entry into an epic narrative that fits their ${archetype.toUpperCase()} character in an ongoing RPG story.

ARCHETYPE VOICE: ${archetypeVoices[archetype] || archetypeVoices.warrior}
CURRENT STORY STATE: Arc ${storyArc}, Chapter ${storyChapter}
${moodContext}
${recentContext}

JOURNAL ENTRY:
"${sanitizedEntry}"

Transform this into a NARRATIVE (150-250 words) that:
1. Treats their real emotions/events as heroic inner struggles or victories
2. Uses fantasy metaphors but stays emotionally authentic and validating
3. References their ongoing story arc subtly (don't force it)
4. Frames growth/learning as character development
5. Ends with forward momentum (hope, not despair) - even difficult days are part of the hero's journey
6. Matches the ${archetype} voice - ${archetypeVoices[archetype]}

IMPORTANT TONE RULES:
- If mood is low (1-2): Acknowledge the struggle, but frame it as a temporary challenge the hero will overcome
- If mood is high (4-5): Celebrate the victory while keeping grounded
- Always validate their real emotions - don't diminish pain or inflate joy artificially
- Fantasy metaphors should enhance, not replace, the authentic human experience

Example transformation for BUILDER archetype (mood: 2/5):
Input: "Today I felt really overwhelmed with work deadlines and my kids were chaotic. I'm exhausted."
Output: "In the Valley of Endless Demands, the Builder faced the Siege of Simultaneity - a test that would shake even the sturdiest foundations. Deadlines loomed like storm clouds while the Spirits of Chaos (disguised as beloved small humans) tested every carefully laid plan. The exhaustion was real, heavy as stone. But the Builder knows this truth: even the greatest structures require rest periods for the foundation to set. Today's overwhelm is not failure - it's the weight of caring deeply about the work and the loved ones. Tomorrow, when strength returns, the Builder will lay the first stone of a better system. For now, rest is the most important construction project."

Write ONLY the narrative transformation. No preamble, no "Here's the transformation:" - just the epic narrative itself.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isPremium ? 500 : 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const transformedNarrative = message.content[0].text.trim();

    console.log('Journal entry transformed successfully', {
      userId: user.id,
      archetype,
      mood,
      entryLength: entry_text.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ transformed_narrative: transformedNarrative });
  } catch (error) {
    // SECURE: Don't expose internal errors to users
    console.error('Journal transformation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to transform journal entry. Your entry will be saved without transformation.' },
      { status: 500 }
    );
  }
}
