import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id } = await request.json();

    if (!event_id || typeof event_id !== 'string') {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the seasonal event
    const { data: event } = await supabaseAdmin
      .from('seasonal_events')
      .select('*')
      .eq('id', event_id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get user's event progress
    const { data: userProgress } = await supabaseAdmin
      .from('user_seasonal_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', event_id)
      .single();

    // Get completed challenges for this event
    const { data: challengeProgress } = await supabaseAdmin
      .from('user_seasonal_challenge_progress')
      .select('*, seasonal_challenges(*)')
      .eq('user_id', user.id)
      .eq('completed', true);

    // Filter to only this event's challenges
    const completedChallenges = (challengeProgress || [])
      .filter(cp => cp.seasonal_challenges?.event_id === event_id)
      .map(cp => cp.seasonal_challenges);

    // Get recently completed quests for narrative context
    const { data: recentQuests } = await supabaseAdmin
      .from('quests')
      .select('transformed_text, difficulty, completed_at')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Check if we already generated an event story for this event
    const storyProgress = profile.story_progress || {};
    const completedEvents = storyProgress.completed_events || [];
    const alreadyGenerated = completedEvents.some(e => e.event === event.name);

    if (alreadyGenerated) {
      return NextResponse.json({
        error: 'Already generated',
        message: 'Event story already generated for this event'
      }, { status: 400 });
    }

    // Build the prompt for Claude
    const archetype = profile.archetype || 'Seeker';
    const level = profile.level || 1;
    const currentThread = profile.current_story_thread || 'an unnamed journey';
    const challengeList = completedChallenges
      .map(c => `- ${c.title}: ${c.description}`)
      .join('\n') || '- Participated in the event challenges';
    const questList = (recentQuests || [])
      .map(q => `- ${q.transformed_text}`)
      .join('\n') || '- Various quests completed';

    const prompt = `You are the narrator for a gamified habit tracker called HabitQuest. The player has just completed a seasonal event called "${event.name}".

Player details:
- Archetype: ${archetype}
- Level: ${level}
- Current story thread: "${currentThread}"
- Event theme: ${event.theme || 'adventure'}
- Event lore: ${event.lore || 'A legendary event that tested the bravest heroes.'}

Challenges completed during this event:
${challengeList}

Recent quests completed:
${questList}

Write a SPECIAL EVENT CHAPTER (200-300 words) that:
1. Creates an epic narrative climax celebrating the completion of "${event.name}"
2. References the challenges and quests they completed during the event
3. Connects back to their ongoing story thread "${currentThread}"
4. Grants a narrative reward — a new title, a legendary item, or a revelation about their character
5. Ends with a hook that bridges into their regular story continuing
6. Adapts tone to the ${archetype} archetype:
   - Warrior: Bold, direct, action-focused
   - Seeker: Curious, discovery-oriented, wonder-filled
   - Builder: Methodical, progress-focused, satisfaction in construction
   - Shadow: Introspective, overcoming internal resistance, self-awareness
   - Sage: Reflective, wisdom-seeking, finding deeper meaning
7. Feels bigger and more dramatic than a regular weekly chapter — this is a SEASON FINALE moment

Tone: Warm, celebratory, epic but not corny. The player should feel genuinely accomplished.
Do NOT use guilt, punishment, or negative framing.
Do NOT reference social features, other players, or leaderboards.
Do NOT use the word "journey" more than once.

Return ONLY a JSON object with these fields:
{
  "chapter_title": "A dramatic title for this event chapter",
  "chapter_text": "The full 200-300 word narrative",
  "narrative_reward": "A brief description of what was earned (e.g., 'Title: Champion of the Winter Realm' or 'Legendary Item: Frostforged Compass')"
}`;

    // Call Claude API
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse the response
    const responseText = message.content[0]?.text || '';
    let storyData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError, responseText);
      // Fallback story
      storyData = {
        chapter_title: `${event.name}: A Hero's Triumph`,
        chapter_text: `The ${event.name} has reached its conclusion, and ${archetype} stands victorious. Through dedication and perseverance, every challenge was met and overcome. The realm remembers those who answered the call when it mattered most. This chapter may end, but the story continues...`,
        narrative_reward: `Title: Champion of ${event.name}`,
      };
    }

    // Update story_progress with event completion
    const updatedStoryProgress = {
      ...storyProgress,
      recent_events: [
        `🏆 EVENT COMPLETED: "${event.name}" — ${storyData.narrative_reward}`,
        ...(storyProgress.recent_events || []),
      ].slice(0, 10),
      completed_events: [
        ...completedEvents,
        {
          event: event.name,
          event_id: event_id,
          completed_at: new Date().toISOString(),
          chapter_title: storyData.chapter_title,
          narrative_reward: storyData.narrative_reward,
        },
      ],
      thread_completion: Math.min((storyProgress.thread_completion || 0) + 25, 100),
    };

    // Save to profile
    await supabaseAdmin
      .from('profiles')
      .update({
        story_progress: updatedStoryProgress,
      })
      .eq('id', user.id);

    // Also log as a story event for the notification system
    await supabaseAdmin
      .from('story_events')
      .insert({
        user_id: user.id,
        event_type: 'seasonal_event_complete',
        event_data: {
          type: 'seasonal_event_complete',
          emoji: event.icon || '🏆',
          title: storyData.chapter_title,
          description: storyData.chapter_text,
          narrative_reward: storyData.narrative_reward,
          event_name: event.name,
        },
        rewards: {
          xp: 0,
          gold: 0,
          narrative_reward: storyData.narrative_reward,
        },
      });

    console.log('Event story generated:', {
      userId: user.id,
      eventId: event_id,
      eventName: event.name,
      chapterTitle: storyData.chapter_title,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      story: storyData,
      event_name: event.name,
      event_icon: event.icon || '🏆',
    });

  } catch (error) {
    console.error('Event story generation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
