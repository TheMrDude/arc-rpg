import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    // SECURE: Verify user is authenticated
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    // Load user profile and story progress for premium users
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, story:story_progress(*)')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.is_premium || profile?.subscription_status === 'active';
    let storyContext = '';

    if (isPremium && profile?.story?.length > 0) {
      const storyProgress = profile.story[0];
      const recentBeats = (storyProgress.story_beats || []).slice(-5); // Last 5 story beats

      if (recentBeats.length > 0) {
        storyContext = `\n\nSTORY CONTEXT (Premium - AI Dungeon Master Mode):
Chapter: ${storyProgress.current_chapter}
Recent story events:
${recentBeats.map((beat, i) => `${i + 1}. ${beat}`).join('\n')}

Use this context to create a quest that continues the user's ongoing story. Reference past events and maintain narrative continuity.`;
      }
    }

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
${storyContext}

Original task: "${sanitizedQuestText}"

Transform this boring task into an epic RPG quest. ${isPremium ? 'As a PREMIUM user with AI Dungeon Master, create 2-3 sentences with rich narrative detail and story continuity.' : 'Keep it to 1-2 sentences.'} Make it exciting and match the archetype style.

Quest:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isPremium ? 250 : 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const transformedText = message.content[0].text.trim();

    // Save story beat for premium users
    if (isPremium) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get or create story progress
      let { data: storyProgress } = await supabaseAdmin
        .from('story_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!storyProgress) {
        const { data: newStory } = await supabaseAdmin
          .from('story_progress')
          .insert({ user_id: user.id, story_beats: [] })
          .select()
          .single();
        storyProgress = newStory;
      }

      // Add new story beat (keep last 20 beats)
      const newBeat = `${archetype} quest: ${transformedText}`;
      const currentBeats = storyProgress.story_beats || [];
      const updatedBeats = [...currentBeats, newBeat].slice(-20);

      await supabaseAdmin
        .from('story_progress')
        .update({
          story_beats: updatedBeats,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }

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
