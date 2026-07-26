import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limiter';
import { FREE_TIER_QUEST_LIMIT } from '@/lib/quest-limits';
import { NARRATION_FLOOR } from '@/lib/narrationConstraints';
import { isPremium as resolveIsPremium } from '@/lib/premium';
// Shared with app/api/preview-quest so the landing-page demo cannot have less
// safety than the logged-in route. See lib/questTextSafety.js.
import { salvageQuestText } from '@/lib/questTextSafety';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// once/daily/weekly only. 'custom' (every N days) was dropped along with its
// number-entry field. "Weekly" means seven days after the last generation, not
// a fixed weekday -- there is deliberately no recurrence_day_of_week.
const VALID_RECURRENCE = ['once', 'daily', 'weekly'];

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

    // SECURITY FIX: Check rate limit BEFORE expensive AI call
    const rateLimit = await checkRateLimit(user.id, 'transform-quest');

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', {
        userId: user.id,
        endpoint: 'transform-quest',
        current: rateLimit.current,
        limit: rateLimit.limit,
        resetAt: rateLimit.reset_at,
        timestamp: new Date().toISOString()
      });

      return createRateLimitResponse(rateLimit);
    }

    const { questText, archetype, difficulty, recurrence } = await request.json();

    // Recurrence is optional and defaults to a one-off, so every existing
    // caller keeps working unchanged. 'custom' was removed: it was the only
    // option needing a number field, and a child cannot misconfigure a choice
    // that does not exist.
    const recurrenceType = recurrence || 'once';
    if (!VALID_RECURRENCE.includes(recurrenceType)) {
      return NextResponse.json({ error: 'Invalid recurrence' }, { status: 400 });
    }
    const isRecurring = recurrenceType !== 'once';

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

    // difficulty is now optional — AI will assign it
    const userDifficulty = difficulty; // may be undefined

    // SECURE: Sanitize input (remove potentially harmful characters)
    const sanitizedQuestText = questText
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim();

    // Load user profile and fetch recent completed quests for continuity
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, is_premium, level, current_story_thread, story_progress')
      .eq('id', user.id)
      .single();

    // One answer for this route now. It previously used
    // subscription_status === 'active' alone, which called every comped account
    // free -- including accounts granted Pro by hand.
    const isPremium = resolveIsPremium(profile);
    const userLevel = profile?.level || 1;
    const currentThread = profile?.current_story_thread || null;
    const storyProgress = profile?.story_progress || { recent_events: [], ongoing_conflicts: [], npcs_met: [], thread_completion: 0 };

    // Fetch recent completed quests for story continuity (ALL USERS)
    const { data: recentQuests } = await supabaseAdmin
      .from('quests')
      .select('transformed_text, completed_at, story_thread, narrative_impact')
      .eq('user_id', user.id)
      .eq('completed', true)
      .eq('status', 'active')
      .order('completed_at', { ascending: false })
      .limit(5);

    // Build rich story context from recent quests and story progress
    let recentQuestContext = '';

    if (currentThread) {
      recentQuestContext += `\n\nCURRENT STORY THREAD: "${currentThread}"`;
      recentQuestContext += `\nThread Completion: ${storyProgress.thread_completion}%`;
    }

    if (storyProgress.ongoing_conflicts?.length > 0) {
      recentQuestContext += `\n\nONGOING CONFLICTS:\n${storyProgress.ongoing_conflicts.map(c => `- ${c}`).join('\n')}`;
    }

    if (storyProgress.npcs_met?.length > 0) {
      recentQuestContext += `\n\nKNOWN CHARACTERS:\n${storyProgress.npcs_met.slice(0, 5).map(npc => `- ${npc}`).join('\n')}`;
    }

    if (storyProgress.recent_events?.length > 0) {
      recentQuestContext += `\n\nRECENT EVENTS:\n${storyProgress.recent_events.slice(0, 3).map(e => `- ${e}`).join('\n')}`;
    }

    if (recentQuests && recentQuests.length > 0) {
      recentQuestContext += `\n\nRECENT COMPLETED QUESTS:\n${recentQuests.map(q => `- ${q.transformed_text}`).join('\n')}`;
    }

    if (recentQuestContext) {
      recentQuestContext += `\n\nCreate continuity with the ongoing story. Reference the current thread, conflicts, or characters naturally. If this quest could advance the current thread, do so. Otherwise, let it be a standalone adventure.`;
    }

    // Two of these were the problem. "heroic battle or conquest" and "stealth
    // mission" are what produced combat and covert-operation framing; the rest
    // audited clean and are unchanged.
    const archetypeStyles = {
      warrior: 'Transform this into a bold challenge met head-on. Courage, not combat: the obstacle is the task itself, never a person.',
      builder: 'Transform this into a construction or creation project. Use engineering and crafting language.',
      shadow: 'Transform this into a quiet, clever plan. Noticing what others miss, moving softly, solving it before anyone notices.',
      sage: 'Transform this into a quest for knowledge or wisdom. Use mystical, intellectual language.',
      seeker: 'Transform this into an exploration or discovery adventure. Use curious, adventurous language.',
    };

    // Ordering is deliberate. The floor comes EARLY, before anything can drift,
    // and the strict output format plus the examples come LAST, immediately
    // before the model's turn -- which is the mitigation for a large constraint
    // block pushing the model off a format the parser depends on.
    const prompt = `You are the storyteller for HabitQuest, a children's adventure game. You turn a
real task a child typed into a short, exciting quest.

${NARRATION_FLOOR}

ARCHETYPE VOICE
Archetype: ${archetype.toUpperCase()}
Style: ${archetypeStyles[archetype] || archetypeStyles.seeker}

PLAYER CONTEXT
Player Level: ${userLevel}
${recentQuestContext}

THE TASK TO TRANSFORM
Original task: "${sanitizedQuestText}"
${isRecurring ? `This is a RECURRING habit that repeats ${recurrenceType === 'daily' ? 'daily' : 'weekly'}. Make it feel like an ongoing duty or ritual, not a one-time mission.` : ''}

LENGTH
Write ONE sentence of 12 to 22 words. Two short sentences are fine if it reads
better, but never more than 30 words in total.

DIFFICULTY (assess the ORIGINAL task, not the quest version)
- EASY: under 15 minutes, low effort, routine (drink water, make bed, feed the cat)
- MEDIUM: 15-60 minutes or moderate effort (go for a run, tidy a room, practise piano)
- HARD: 60+ minutes, high effort, or real willpower (a full workout, a long essay)

OUTPUT FORMAT -- reply with EXACTLY these four lines and nothing else. No
preamble, no JSON, no code fences, no commentary:

QUEST: [your 12-22 word quest]
DIFFICULTY: [easy OR medium OR hard]
STORY_THREAD: [brief story thread name OR "none"]
NARRATIVE_IMPACT: [short impact phrase OR "none"]

Examples of the transformation, showing what the child typed and what it became:

TASK: read 3 chapters
QUEST: Slip into the quiet corner of the library and read three more chapters before the lamps go out.
DIFFICULTY: easy
STORY_THREAD: The Unfinished Book
NARRATIVE_IMPACT: One chapter closer to the ending

TASK: tidy my room
QUEST: Face the mountain of clutter in your room and win back the floor, one armful at a time.
DIFFICULTY: medium
STORY_THREAD: The Reclaimed Room
NARRATIVE_IMPACT: The floor is yours again

TASK: help my friend with homework
QUEST: Sit with your friend and untangle the homework that has been beating them all week.
DIFFICULTY: easy
STORY_THREAD: The Kindest Kind of Strong
NARRATIVE_IMPACT: They will ask you again tomorrow, and that is the reward

Now transform the task above:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      // 12-22 words needs nowhere near 200. Both tiers stay under the new bound;
      // a tighter ceiling makes a 40-word run-on structurally harder.
      max_tokens: isPremium ? 160 : 140,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].text.trim();

    // Parse the response to extract quest, difficulty, story thread, and narrative impact
    const questMatch = response.match(/QUEST:\s*(.+?)(?=\nDIFFICULTY:|\nSTORY_THREAD:|$)/s);
    const difficultyMatch = response.match(/DIFFICULTY:\s*(.+?)(?=\nSTORY_THREAD:|$)/s);
    const threadMatch = response.match(/STORY_THREAD:\s*(.+?)(?=\nNARRATIVE_IMPACT:|$)/s);
    const impactMatch = response.match(/NARRATIVE_IMPACT:\s*(.+?)$/s);

    let transformedText, storyThread, narrativeImpact, aiDifficulty;

    if (questMatch) {
      // Proper format found
      transformedText = questMatch[1].trim();
      storyThread = threadMatch ? threadMatch[1].trim() : null;
      narrativeImpact = impactMatch ? impactMatch[1].trim() : null;

      // Parse AI difficulty (fallback to medium if invalid)
      const rawDifficulty = difficultyMatch ? difficultyMatch[1].trim().toLowerCase() : 'medium';
      aiDifficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : 'medium';
    } else {
      // FALLBACK. This path used to end in `transformedText = response` -- the raw
      // model output. A parse failure therefore became narration a child reads,
      // which is the exact class of failure this whole change exists to stop. It
      // also silently paid out medium XP and logged nothing, so nobody could see
      // it happening.
      //
      // Now: salvage a candidate, refuse it unless it looks like a quest, and
      // otherwise fall back to the player's OWN words. Their task text is always
      // safe, because they wrote it.
      const salvaged = salvageQuestText(response);
      if (salvaged) {
        transformedText = salvaged;
      } else {
        transformedText = sanitizedQuestText;
      }
      storyThread = null;
      narrativeImpact = null;
      // Lowest tier, not medium. Paying 25 XP for a broken response is an
      // invisible economy event; paying 10 is a visible non-event.
      aiDifficulty = 'easy';

      console.warn('transform-quest: response did not match the expected format', {
        userId: user.id,
        usedSalvage: Boolean(salvaged),
        usedPlayerText: !salvaged,
        responseLength: response.length,
        responsePreview: response.slice(0, 120),
        timestamp: new Date().toISOString(),
      });
    }

    // Clean up story thread and narrative impact
    const cleanThread = storyThread && storyThread.toLowerCase() !== 'none' ? storyThread : null;
    const cleanImpact = narrativeImpact && narrativeImpact.toLowerCase() !== 'none' ? narrativeImpact : null;

    // XP values by difficulty
    const XP_VALUES = { easy: 10, medium: 25, hard: 50 };

    const xpValue = XP_VALUES[aiDifficulty] || 25;

    // A one-off quest is still inserted by the caller, exactly as before.
    // A recurring habit is created here instead, because the rule and its first
    // instance have to be written together and stamped with each other's id --
    // splitting that across client round-trips is how you get an orphan rule
    // with no quest, or a quest the generator can never supersede.
    let recurringQuest = null;
    let firstQuest = null;

    if (isRecurring) {
      if (!isPremium) {
        const { count } = await supabaseAdmin
          .from('recurring_quests')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (count >= FREE_TIER_QUEST_LIMIT) {
          return NextResponse.json({
            error: `Free tier limited to ${FREE_TIER_QUEST_LIMIT} recurring quests. Upgrade to Pro for unlimited.`,
            limit_reached: true,
          }, { status: 403 });
        }
      }

      const { data: rule, error: ruleError } = await supabaseAdmin
        .from('recurring_quests')
        .insert({
          user_id: user.id,
          original_text: sanitizedQuestText,
          transformed_text: transformedText,
          difficulty: aiDifficulty,
          xp_value: xpValue,
          archetype,
          recurrence_type: recurrenceType,
          recurrence_interval: 1,
          is_active: true,
          last_generated_at: new Date().toISOString().split('T')[0], // today
        })
        .select()
        .single();

      if (ruleError || !rule) {
        console.error('Error creating recurring quest rule:', ruleError);
        return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
      }

      const { data: quest, error: questError } = await supabaseAdmin
        .from('quests')
        .insert({
          user_id: user.id,
          original_text: sanitizedQuestText,
          transformed_text: transformedText,
          difficulty: aiDifficulty,
          xp_value: xpValue,
          completed: false,
          status: 'active',
          recurring_quest_id: rule.id,
          story_thread: cleanThread,
          narrative_impact: cleanImpact ? { description: cleanImpact } : null,
        })
        .select()
        .single();

      if (questError) {
        // The rule exists but today's instance does not. Roll the rule back
        // rather than leaving a habit that silently produces nothing until
        // tomorrow's cron run.
        await supabaseAdmin.from('recurring_quests').delete().eq('id', rule.id);
        console.error('Error creating first recurring instance:', questError);
        return NextResponse.json({ error: 'Failed to create recurring quest' }, { status: 500 });
      }

      recurringQuest = rule;
      firstQuest = quest;
    }

    console.log('Quest transformed successfully', {
      userId: user.id,
      archetype,
      difficulty: aiDifficulty,
      recurrence: recurrenceType,
      storyThread: cleanThread,
      narrativeImpact: cleanImpact,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      transformedText,
      difficulty: aiDifficulty,
      xpValue,
      storyThread: cleanThread,
      narrativeImpact: cleanImpact ? { description: cleanImpact } : null,
      // Present only for recurring habits; tells the caller the quest is
      // already saved and must not be inserted again.
      recurringQuest,
      firstQuest,
    });
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
