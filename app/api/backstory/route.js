import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get quest statistics
    const { data: quests } = await supabase
      .from('quests')
      .select('original_text, transformed_text, difficulty, completed, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const completedCount = quests?.filter(q => q.completed).length || 0;
    const totalQuests = quests?.length || 0;
    const difficultyBreakdown = {
      easy: quests?.filter(q => q.difficulty === 'easy' && q.completed).length || 0,
      medium: quests?.filter(q => q.difficulty === 'medium' && q.completed).length || 0,
      hard: quests?.filter(q => q.difficulty === 'hard' && q.completed).length || 0,
    };

    // Get memorable recent quests
    const recentQuests = quests
      ?.filter(q => q.completed && q.transformed_text)
      .slice(-10)
      .map(q => `- ${q.transformed_text || q.original_text}`)
      .join('\n') || '(No completed quests yet)';

    // Create AI prompt for backstory
    const prompt = `You are a master storyteller crafting an epic RPG character backstory.

CHARACTER PROFILE:
- Archetype: ${profile.archetype}
- Level: ${profile.level}
- Total XP: ${profile.xp}
- Quests Completed: ${completedCount}/${totalQuests}
- Victories: ${difficultyBreakdown.easy} Easy, ${difficultyBreakdown.medium} Medium, ${difficultyBreakdown.hard} Hard

RECENT LEGENDARY DEEDS:
${recentQuests}

Write a compelling 3-paragraph backstory that:

1. **ORIGINS**: Explain how they became a ${profile.archetype}. What event, choice, or calling led them to this path? Reference their archetype's unique traits and abilities.

2. **THE JOURNEY**: Weave in their actual quest accomplishments as "legendary deeds" in their tale. Transform their real tasks into epic narrative moments that show growth from Level 1 to Level ${profile.level}.

3. **THE PRESENT**: Where they stand now - their current power level, reputation, and what legendary challenges await them. Make them feel like a hero in the middle of an epic saga.

STYLE REQUIREMENTS:
- Epic fantasy tone (think D&D, Lord of the Rings)
- Use "you" perspective to make it personal
- Incorporate specific quest details naturally
- Make it feel unique to THEIR journey
- 200-300 words total
- No JSON, no metadata - pure narrative only

Write the backstory now:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });

    const backstory = message.content[0].text.trim();

    // Save backstory to profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ backstory: backstory })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to save backstory:', updateError);
    }

    return NextResponse.json({
      success: true,
      backstory: backstory
    });

  } catch (error) {
    console.error('Backstory generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate backstory' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current backstory
    const { data: profile } = await supabase
      .from('profiles')
      .select('backstory')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      backstory: profile?.backstory || null
    });

  } catch (error) {
    console.error('Backstory fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backstory' },
      { status: 500 }
    );
  }
}
