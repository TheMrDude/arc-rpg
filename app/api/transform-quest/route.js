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
      .select('subscription_status, level, current_story_thread, story_progress')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';
    const userLevel = profile?.level || 1;
    const currentThread = profile?.current_story_thread || null;
    const storyProgress = profile?.story_progress || { recent_events: [], ongoing_conflicts: [], npcs_met: [], thread_completion: 0 };

    // Fetch recent completed quests for story continuity (ALL USERS)
    const { data: recentQuests } = await supabaseAdmin
      .from('quests')
      .select('transformed_text, completed_at, story_thread, narrative_impact')
      .eq('user_id', user.id)
      .eq('completed', true)
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

    const archetypeStyles = {
      warrior: 'Transform this into a heroic battle or conquest. Use bold, action-oriented language.',
      builder: 'Transform this into a construction or creation project. Use engineering and crafting language.',
      shadow: 'Transform this into a stealth mission or cunning strategy. Use mysterious, strategic language.',
      sage: 'Transform this into a quest for knowledge or wisdom. Use mystical, intellectual language.',
      seeker: 'Transform this into an exploration or discovery adventure. Use curious, adventurous language.',
    };

    const prompt = `You are a quest generator for an RPG game with ongoing story threads.

Archetype: ${archetype.toUpperCase()}
Style: ${archetypeStyles[archetype] || archetypeStyles.warrior}
Difficulty: ${difficulty}
Player Level: ${userLevel}
${recentQuestContext}

Original task: "${sanitizedQuestText}"

Transform this boring task into an epic RPG quest that fits the ongoing story. Keep the quest description to 1-2 sentences. Make it exciting and match the archetype style.

Then, provide story metadata in JSON format.

Format your response as:
QUEST: [1-2 sentence epic quest description]
STORY_THREAD: [brief story thread name, e.g., "The Shadow Invasion" or "none" if standalone]
NARRATIVE_IMPACT: [short phrase describing what completing this quest accomplishes in the story, e.g., "Weakens enemy forces" or "none"]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: isPremium ? 300 : 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const response = message.content[0].text.trim();

    // Parse the response to extract quest, story thread, and narrative impact
    const questMatch = response.match(/QUEST:\s*(.+?)(?=\nSTORY_THREAD:|$)/s);
    const threadMatch = response.match(/STORY_THREAD:\s*(.+?)(?=\nNARRATIVE_IMPACT:|$)/s);
    const impactMatch = response.match(/NARRATIVE_IMPACT:\s*(.+?)$/s);

    const transformedText = questMatch ? questMatch[1].trim() : response;
    const storyThread = threadMatch ? threadMatch[1].trim() : null;
    const narrativeImpact = impactMatch ? impactMatch[1].trim() : null;

    // Clean up story thread and narrative impact
    const cleanThread = storyThread && storyThread.toLowerCase() !== 'none' ? storyThread : null;
    const cleanImpact = narrativeImpact && narrativeImpact.toLowerCase() !== 'none' ? narrativeImpact : null;

    console.log('Quest transformed successfully', {
      userId: user.id,
      archetype,
      difficulty,
      storyThread: cleanThread,
      narrativeImpact: cleanImpact,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      transformedText,
      storyThread: cleanThread,
      narrativeImpact: cleanImpact ? { description: cleanImpact } : null
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
