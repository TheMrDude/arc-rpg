import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from '@/lib/api-auth';
import { getSupabaseAdminClient } from '@/lib/supabase-server';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

const XP_VALUES = { easy: 10, medium: 25, hard: 50 };

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdminClient();

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_premium, subscription_status, archetype, level, current_story_thread, story_progress')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isPremium = profile.is_premium || profile.subscription_status === 'active';

    // Free tier: limit to 3 active recurring quests
    if (!isPremium) {
      const { count } = await supabaseAdmin
        .from('recurring_quests')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (count >= 3) {
        return NextResponse.json({
          error: 'Free tier limited to 3 recurring quests. Upgrade to Pro for unlimited.',
          limit_reached: true,
        }, { status: 403 });
      }
    }

    // Rate limit check
    const rateLimit = await checkRateLimit(user.id, 'transform-quest');
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit);
    }

    const { original_text, recurrence_type, recurrence_interval } = await request.json();

    // Validate
    if (!original_text || typeof original_text !== 'string' || original_text.trim().length === 0) {
      return NextResponse.json({ error: 'Quest text is required' }, { status: 400 });
    }
    if (original_text.length > 200) {
      return NextResponse.json({ error: 'Quest text too long (max 200 characters)' }, { status: 400 });
    }
    if (!['daily', 'weekly', 'custom'].includes(recurrence_type)) {
      return NextResponse.json({ error: 'Invalid recurrence type' }, { status: 400 });
    }
    if (recurrence_type === 'custom') {
      const interval = parseInt(recurrence_interval);
      if (!interval || interval < 2 || interval > 30) {
        return NextResponse.json({ error: 'Custom interval must be 2-30 days' }, { status: 400 });
      }
    }

    // Sanitize
    const sanitizedText = original_text.replace(/[<>]/g, '').trim();
    const archetype = profile.archetype || 'seeker';

    // Call Claude to transform the quest and assign difficulty
    const archetypeStyles = {
      warrior: 'Transform this into a heroic battle or conquest. Use bold, action-oriented language.',
      builder: 'Transform this into a construction or creation project. Use engineering and crafting language.',
      shadow: 'Transform this into a stealth mission or cunning strategy. Use mysterious, strategic language.',
      sage: 'Transform this into a quest for knowledge or wisdom. Use mystical, intellectual language.',
      seeker: 'Transform this into an exploration or discovery adventure. Use curious, adventurous language.',
    };

    const prompt = `You are a quest generator for an RPG game.

Archetype: ${archetype.toUpperCase()}
Style: ${archetypeStyles[archetype] || archetypeStyles.seeker}
Player Level: ${profile.level || 1}

This is a RECURRING habit that repeats ${recurrence_type === 'daily' ? 'daily' : recurrence_type === 'weekly' ? 'weekly' : `every ${recurrence_interval} days`}.

Original task: "${sanitizedText}"

Transform this into an epic RPG quest (1-2 sentences). Since this is a recurring habit, make it feel like an ongoing duty or ritual, not a one-time mission.

Then assess the difficulty of the ORIGINAL task:
- EASY: Quick tasks under 15 minutes, low effort, routine
- MEDIUM: Tasks requiring 15-60 minutes or moderate effort
- HARD: Tasks requiring 60+ minutes, high effort, or significant willpower

IMPORTANT: Format response EXACTLY like this:
QUEST: [Your epic quest description]
DIFFICULTY: [easy OR medium OR hard]`;

    let transformedText, aiDifficulty;

    try {
      const anthropic = new Anthropic();
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      });

      const response = message.content[0].text.trim();
      const questMatch = response.match(/QUEST:\s*(.+?)(?=\nDIFFICULTY:|$)/s);
      const difficultyMatch = response.match(/DIFFICULTY:\s*(\w+)/);

      transformedText = questMatch ? questMatch[1].trim() : sanitizedText;
      const rawDifficulty = difficultyMatch ? difficultyMatch[1].trim().toLowerCase() : 'medium';
      aiDifficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : 'medium';
    } catch (aiError) {
      console.error('AI transformation failed, using original text:', aiError.message);
      transformedText = sanitizedText;
      aiDifficulty = 'medium';
    }

    const xpValue = XP_VALUES[aiDifficulty];

    // Insert recurring quest
    const { data: recurringQuest, error: insertError } = await supabaseAdmin
      .from('recurring_quests')
      .insert({
        user_id: user.id,
        original_text: sanitizedText,
        transformed_text: transformedText,
        difficulty: aiDifficulty,
        xp_value: xpValue,
        archetype,
        recurrence_type,
        recurrence_interval: recurrence_type === 'custom' ? parseInt(recurrence_interval) : 1,
        is_active: true,
        last_generated_at: new Date().toISOString().split('T')[0], // today
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating recurring quest:', insertError);
      return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
    }

    // Generate first quest instance immediately
    let firstQuest = null;
    try {
      const { data: quest } = await supabaseAdmin
        .from('quests')
        .insert({
          user_id: user.id,
          original_text: sanitizedText,
          transformed_text: transformedText,
          difficulty: aiDifficulty,
          xp_value: xpValue,
          completed: false,
        })
        .select()
        .single();

      firstQuest = quest;
    } catch (err) {
      console.error('Failed to generate first quest instance:', err);
      // Non-fatal — the cron will generate it
    }

    console.log('Recurring quest created:', {
      userId: user.id,
      questId: recurringQuest.id,
      difficulty: aiDifficulty,
      recurrenceType: recurrence_type,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      recurring_quest: recurringQuest,
      first_quest: firstQuest,
    }, { status: 201 });

  } catch (error) {
    console.error('Recurring quest creation error:', error);
    return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
  }
}
