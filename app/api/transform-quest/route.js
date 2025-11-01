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
      console.error('Transform quest: No bearer token', {
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error('Transform quest: Unauthorized access attempt', {
        error: authError?.message,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questText, archetype, difficulty } = await request.json();

    // SECURE: Input validation
    if (!questText || typeof questText !== 'string') {
      return NextResponse.json({ error: 'Invalid quest text' }, { status: 400 });
    }

    if (questText.length > 500) {
      return NextResponse.json({ error: 'Quest text too long (max 500 characters)' }, { status: 400 });
    }

    if (questText.trim().length === 0) {
      return NextResponse.json({ error: 'Quest text cannot be empty' }, { status: 400 });
    }

    const validArchetypes = ['warrior', 'builder', 'shadow', 'sage', 'seeker'];
    if (!archetype || !validArchetypes.includes(archetype)) {
      return NextResponse.json({ error: 'Invalid archetype' }, { status: 400 });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!difficulty || !validDifficulties.includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    // SECURE: Sanitize input (remove potentially harmful characters)
    const sanitizedQuestText = questText
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();

    // Load user profile and fetch recent completed quests for continuity
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, story_chapter, story_last_event')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';

    // Fetch recent completed quests for story continuity (ALL USERS)
    const { data: recentQuests } = await supabaseAdmin
      .from('quests')
      .select('transformed_text, completed_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(5);

    const recentQuestContext = recentQuests && recentQuests.length > 0
      ? `\n\nRECENT COMPLETED QUESTS (for continuity):\n${recentQuests.map(q => `- ${q.transformed_text}`).join('\n')}\n\nIf appropriate, create subtle continuity with these recent quests (reference locations, characters, or themes). Don't force it - only add continuity if it flows naturally.`
      : '';

    const archetypeStyles = {
      warrior: 'Transform this into a heroic battle or conquest. Use bold, action-oriented language.',
      builder: 'Transform this into a construction or creation project. Use engineering and crafting language.',
      shadow: 'Transform this into a stealth mission or cunning strategy. Use mysterious, strategic language.',
      sage: 'Transform this into a quest for knowledge or wisdom. Use mystical, intellectual language.',
      seeker: 'Transform this into an exploration or discovery adventure. Use curious, adventurous language.',
    };

    const prompt = `You are a quest generator for an RPG game.

Archetype: ${archetype.toUpperCase()}
Style: ${archetypeStyles[archetype] || archetypeStyles.warrior}
Difficulty: ${difficulty}
${recentQuestContext}

Original task: "${sanitizedQuestText}"

Transform this boring task into an epic RPG quest. Keep it to 1-2 sentences. Make it exciting and match the archetype style.

Quest:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isPremium ? 250 : 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const transformedText = message.content[0].text.trim();

    // Story continuity now handled via story_chapter and story_last_event in profiles table
    // Updated by weekly-summary API when generating chapter stories

    console.log('Quest transformed successfully', {
      userId: user.id,
      archetype,
      difficulty,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ transformedText });
  } catch (error) {
    // SECURE: Don't expose internal errors to users
    console.error('Quest transformation error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Fallback to original text if transformation fails
    const { questText } = await request.json().catch(() => ({ questText: 'Unknown quest' }));
    return NextResponse.json(
      { error: 'Failed to transform quest', transformedText: questText },
      { status: 500 }
    );
  }
}
