import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkAIRateLimit, logAIUsage } from '@/lib/aiRateLimiting';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check rate limit
    const rateLimit = await checkAIRateLimit(user.id, 'suggestions');
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: `You can generate ${rateLimit.limit} quest suggestion batches per day. You've used ${rateLimit.usedToday}. Try again after ${new Date(rateLimit.resetAt).toLocaleTimeString()}.`,
        resetAt: rateLimit.resetAt,
        remaining: rateLimit.remaining
      }, { status: 429 });
    }

    // Get recent completed quests to understand patterns
    const { data: completedQuests } = await supabase
      .from('quests')
      .select('original_text, transformed_text, difficulty')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(15);

    // Get active quests to avoid duplicates
    const { data: activeQuests } = await supabase
      .from('quests')
      .select('original_text')
      .eq('user_id', user.id)
      .eq('completed', false);

    const completedList = (completedQuests || []).map(q => `- ${q.original_text}`).join('\\n');
    const activeList = (activeQuests || []).map(q => q.original_text).join(', ');

    // Create AI prompt
    const prompt = `You are a quest advisor for a ${profile.archetype} at Level ${profile.level}.

RECENTLY COMPLETED:
${completedList || '(None yet)'}

CURRENTLY ACTIVE:
${activeList || '(None)'}

Analyze this hero's quest patterns and suggest 8 new quests they should tackle next.

Requirements:
1. Match their established patterns but introduce variety
2. Progress in difficulty (2 easy, 4 medium, 2 hard)
3. Be specific and actionable real-life tasks
4. Don't duplicate active or recent quests
5. Consider ${profile.archetype} archetype strengths

Format each suggestion EXACTLY as:
QUEST|[difficulty]|[specific task in 5-10 words]

Example:
QUEST|medium|Review and respond to 10 important emails
QUEST|hard|Complete project proposal with detailed timeline
QUEST|easy|Organize desk workspace for better focus

Generate 8 quest suggestions now:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].text.trim();

    // Parse quest suggestions
    const suggestions = [];
    const lines = response.split('\\n');

    for (const line of lines) {
      const match = line.match(/QUEST\\|(\\w+)\\|(.+)/);
      if (match) {
        const [, difficulty, text] = match;
        suggestions.push({
          difficulty: difficulty.toLowerCase(),
          text: text.trim(),
          xp_value: difficulty.toLowerCase() === 'easy' ? 10 : difficulty.toLowerCase() === 'medium' ? 25 : 50
        });
      }
    }

    // Log AI usage for rate limiting
    await logAIUsage(user.id, 'suggestions', {
      suggestions_count: suggestions.length,
      profile_level: profile.level,
      archetype: profile.archetype
    });

    return NextResponse.json({
      success: true,
      suggestions: suggestions.slice(0, 8)
    });

  } catch (error) {
    console.error('Quest suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
