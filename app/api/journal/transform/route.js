import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

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

    // SECURITY FIX: Check rate limit BEFORE expensive AI call
    const rateLimit = await checkRateLimit(user.id, 'transform-journal');

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', {
        userId: user.id,
        endpoint: 'transform-journal',
        current: rateLimit.current,
        limit: rateLimit.limit,
        resetAt: rateLimit.reset_at,
        timestamp: new Date().toISOString()
      });

      return createRateLimitResponse(rateLimit);
    }

    const { entry_id, entry_text } = await request.json();

    // SECURE: Input validation
    if (!entry_id || typeof entry_id !== 'string') {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    if (!entry_text || typeof entry_text !== 'string') {
      return NextResponse.json({ error: 'Invalid entry text' }, { status: 400 });
    }

    if (entry_text.length < 50) {
      return NextResponse.json({ error: 'Entry must be at least 50 characters' }, { status: 400 });
    }

    if (entry_text.length > 5000) {
      return NextResponse.json({ error: 'Entry text too long (max 5000 characters)' }, { status: 400 });
    }

    // SECURE: Verify entry belongs to user
    const { data: entry, error: entryError } = await supabaseAdmin
      .from('journal_entries')
      .select('id, user_id')
      .eq('id', entry_id)
      .eq('user_id', user.id)
      .single();

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Entry not found or access denied' }, { status: 404 });
    }

    // Get user profile for archetype and premium status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('archetype, is_premium, subscription_status, level, story_chapter')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';

    // Determine transformation depth
    const transformationType = isPremium ? 'deep' : 'basic';
    const maxWords = isPremium ? 250 : 100;

    // SECURE: Sanitize input
    const sanitizedEntry = entry_text
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();

    // Fetch recent journal entries for emotional continuity (premium only)
    let recentContext = '';
    if (isPremium) {
      const { data: recentEntries } = await supabaseAdmin
        .from('journal_entries')
        .select('transformed_narrative, mood, created_at')
        .eq('user_id', user.id)
        .not('transformed_narrative', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (recentEntries && recentEntries.length > 0) {
        recentContext = `\n\nRECENT REFLECTIONS (for continuity):\n${recentEntries.map(e =>
          `- ${e.transformed_narrative.substring(0, 100)}... (mood: ${e.mood || 'neutral'})`
        ).join('\n')}\n\nCreate subtle continuity with these recent reflections if appropriate.`;
      }
    }

    const archetypeVoices = {
      warrior: 'determined, courageous, action-oriented - frames struggles as battles to overcome',
      builder: 'pragmatic, constructive, steady - frames challenges as projects to build through',
      shadow: 'introspective, strategic, deep - frames emotions as inner landscapes to navigate',
      sage: 'wise, reflective, philosophical - frames experiences as lessons and growth',
      seeker: 'curious, adventurous, open - frames life as an ongoing journey of discovery',
    };

    const archetype = profile?.archetype || 'warrior';
    const storyChapter = profile?.story_chapter || 0;
    const storyArc = Math.floor(storyChapter / 4); // 4 chapters per arc

    const prompt = `You are transforming a user's personal journal entry into an epic narrative that fits their ${archetype.toUpperCase()} character in an ongoing RPG story.

TRANSFORMATION TYPE: ${transformationType}
MAX WORDS: ${maxWords}
ARCHETYPE VOICE: ${archetypeVoices[archetype] || archetypeVoices.warrior}
CURRENT STORY STATE: Arc ${storyArc}, Chapter ${storyChapter}
${recentContext}

JOURNAL ENTRY:
"${sanitizedEntry}"

Transform this into a ${transformationType} narrative (${maxWords} words max) that:
1. Treats their real emotions/events as heroic inner struggles or victories
2. Uses fantasy metaphors but stays emotionally authentic and validating
3. References their ongoing story arc subtly (don't force it)
4. Frames growth/learning as character development
5. Ends with forward momentum (hope, not despair) - even difficult days are part of the hero's journey
6. Matches the ${archetype} voice - ${archetypeVoices[archetype]}

${isPremium
  ? `DEEP MODE: Include rich detail, multiple metaphor layers, archetype-specific wisdom. Extract specific quest-like suggestions from their reflection (e.g., "Perhaps tomorrow's quest: face that difficult conversation" or "The next trial awaits: organize the chaos").`
  : `BASIC MODE: Keep it concise but impactful (${maxWords} words max). Show them the magic so they want more. Make it feel meaningful but leave them wanting the deeper insights of premium.`
}

IMPORTANT TONE RULES:
- Validate their real emotions - don't diminish pain or inflate joy artificially
- If they're struggling, acknowledge it as part of the hero's journey (temporary challenge to overcome)
- If they're thriving, celebrate it while keeping grounded
- Fantasy metaphors should enhance, not replace, the authentic human experience
- Make them feel seen, understood, and heroic

Example for ${archetype.toUpperCase()} archetype:
${getExampleForArchetype(archetype, isPremium, maxWords)}

Write ONLY the narrative transformation. No preamble, no "Here's the transformation:" - just the epic narrative itself.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isPremium ? 500 : 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const transformedNarrative = message.content[0].text.trim();

    // Update entry with transformation
    const { error: updateError } = await supabaseAdmin
      .from('journal_entries')
      .update({
        transformed_narrative: transformedNarrative,
        transformation_type: transformationType,
        updated_at: new Date().toISOString()
      })
      .eq('id', entry_id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to update entry with transformation:', updateError);
      return NextResponse.json(
        { error: 'Failed to save transformation' },
        { status: 500 }
      );
    }

    console.log('Journal entry transformed successfully', {
      userId: user.id,
      entryId: entry_id,
      archetype,
      transformationType,
      wordCount: transformedNarrative.split(/\s+/).length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      transformed_narrative: transformedNarrative,
      transformation_type: transformationType
    });

  } catch (error) {
    console.error('Journal transformation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Failed to transform journal entry. Your entry has been saved without transformation.' },
      { status: 500 }
    );
  }
}

/**
 * Get example transformation for each archetype
 */
function getExampleForArchetype(archetype, isPremium, maxWords) {
  const examples = {
    warrior: isPremium
      ? `Input: "Today I felt really overwhelmed with work deadlines and my kids were chaotic. I'm exhausted."\nOutput (${maxWords} words): "In the Arena of Endless Demands, the Warrior faced the Siege of Simultaneity - a test that would shake even the sturdiest resolve. Deadlines loomed like storm clouds on the horizon while the Spirits of Chaos (disguised as beloved small humans) tested every carefully laid battle plan. The exhaustion was real, heavy as chainmail worn too long. But the Warrior knows this truth: even the greatest champions must rest between battles. Today's overwhelm is not defeat - it's the weight of caring deeply about the work and the loved ones. Tomorrow, when strength returns, the Warrior will rise again. For now, sheathing the sword and resting is the bravest act of all. Quest suggestion: Tomorrow, delegate one task to an ally."`
      : `Input: "Today I felt overwhelmed with work deadlines."\nOutput (${maxWords} words): "The Warrior faced the Storm of Deadlines today, feeling the weight of too many battles at once. But every great hero knows: exhaustion is not defeat. It's proof of caring. Rest tonight, rise tomorrow."`,

    builder: isPremium
      ? `Input: "Started organizing my home office but gave up halfway. Nothing ever gets finished."\nOutput (${maxWords} words): "In the Workshop of Ambition, the Builder began constructing a new foundation - a space for focus and creation. Midway through, doubt crept in like rot in timber. 'Nothing ever gets finished,' whispered the voice of the Incomplete. But the Builder knows what others forget: Rome wasn't built in a day, and neither is a life. Today's half-finished project is tomorrow's head start. The tools are laid out. The blueprint exists. That's more progress than yesterday's blank canvas. Every master builder has a pile of unfinished projects - they're not failures, they're lessons in lumber form. Quest suggestion: Tomorrow, spend just 15 minutes continuing the build."`
      : `Input: "Started organizing but gave up halfway."\nOutput (${maxWords} words): "The Builder laid the first stones today, then paused. But every master knows: progress isn't perfection. The foundation is set. Tomorrow, add another layer."`,

    shadow: isPremium
      ? `Input: "Been avoiding some difficult feelings about my past. Easier to stay busy."\nOutput (${maxWords} words): "In the Caverns of the Unspoken, the Shadow dwells where most fear to tread. Today, the difficult feelings emerged like echoes from the deep - old wounds, past chapters best left unread. The instinct was to flee back to the bright noise of busyness, to drown out the whispers with activity. But the Shadow knows what the light-dwellers don't: avoidance is just delayed confrontation. These feelings aren't enemies to flee from - they're old companions who know your truest name. They wait in the dark not to harm, but to be heard. Today's avoidance is okay; the shadows will still be there tomorrow, patient as stone. When you're ready to descend, they'll reveal their gifts. Quest suggestion: Tomorrow, sit with one difficult feeling for five minutes."`
      : `Input: "Been avoiding difficult feelings."\nOutput (${maxWords} words): "The Shadow noticed what others miss: the feelings waiting in the dark. Avoidance is just delayed wisdom. When you're ready to descend, the truth awaits."`,

    sage: isPremium
      ? `Input: "Made the same mistake again. When will I learn?"\nOutput (${maxWords} words): "In the Library of Lessons Repeated, the Sage encountered an old volume - a familiar chapter, read many times before. 'When will I learn?' echoes through the halls like a question carved in stone. But here's the wisdom hidden in repetition: the lesson appears again not because you failed to learn, but because you're ready for a deeper understanding. The first time, you learned the surface. The second time, the context. This time? Perhaps you'll discover why the pattern persists, what need it serves, what fear it protects. The Sage knows: wisdom isn't avoiding mistakes - it's extracting ever-deeper meaning from them. You're not failing to learn. You're learning to learn. Quest suggestion: Tomorrow, journal about what this mistake protects you from."`
      : `Input: "Made the same mistake again."\nOutput (${maxWords} words): "The Sage revisited an old lesson. Repetition isn't failure - it's depth. Each time, you learn something new. Wisdom takes many passes."`,

    seeker: isPremium
      ? `Input: "Feeling lost and directionless lately. Don't know where I'm going."\nOutput (${maxWords} words): "In the Uncharted Territories, the Seeker wandered without map or compass, feeling the familiar ache of directionlessness. 'Where am I going?' the question echoed across empty plains. But here's the secret every explorer learns: feeling lost is just another word for being between destinations. The greatest discoveries happen not when you know where you're going, but when you're brave enough to admit you don't. This 'lost' feeling? It's not emptiness - it's possibility space. It's the universe saying 'What do you want to find?' The path will reveal itself, but only to those willing to walk without knowing. Today's confusion is tomorrow's clarity. Quest suggestion: Tomorrow, try one small new thing - any direction is movement."`
      : `Input: "Feeling lost and directionless."\nOutput (${maxWords} words): "The Seeker stood at the crossroads, map unclear. But every explorer knows: being lost is just being between discoveries. The path reveals itself to those who keep walking."`,
  };

  return examples[archetype] || examples.warrior;
}
