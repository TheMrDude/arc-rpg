import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to prevent caching of authenticated requests
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

export async function GET(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile including story progress
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, archetype, level, current_streak, story_chapter, story_last_event')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';

    // Calculate current week range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Check if summary already exists for this week
    const { data: existingSummary } = await supabaseAdmin
      .from('weekly_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start_date', weekStart.toISOString().split('T')[0])
      .single();

    if (existingSummary) {
      return NextResponse.json({ summary: existingSummary });
    }

    // Get completed quests from this week
    const { data: quests } = await supabaseAdmin
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString())
      .order('completed_at', { ascending: true });

    // Get journal entries from this week
    const { data: journalEntries } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true });

    if ((!quests || quests.length === 0) && (!journalEntries || journalEntries.length === 0)) {
      return NextResponse.json({
        message: 'No completed quests or journal entries this week yet',
        questsCompleted: 0,
        journalEntriesCount: 0
      });
    }

    // Calculate stats
    const totalXP = (quests || []).reduce((sum, q) => sum + (q.xp_value || 0), 0);
    const questsByDifficulty = {
      easy: (quests || []).filter(q => q.difficulty === 'easy').length,
      medium: (quests || []).filter(q => q.difficulty === 'medium').length,
      hard: (quests || []).filter(q => q.difficulty === 'hard').length,
    };

    // Calculate journal entry stats
    const journalCount = (journalEntries || []).length;
    const journalWithMood = (journalEntries || []).filter(j => j.mood !== null);
    const avgMood = journalWithMood.length > 0
      ? (journalWithMood.reduce((sum, j) => sum + j.mood, 0) / journalWithMood.length).toFixed(1)
      : null;

    // Generate AI summary
    let summaryText = '';

    if (isPremium) {
      // Premium: Epic narrative summary with chapter continuity
      const currentChapter = profile?.story_chapter || 1;
      const lastEvent = profile?.story_last_event || "Your journey began in the realm of forgotten tasks...";

      const questList = (quests || []).slice(0, 10).map(q =>
        `- ${q.transformed_text} (${q.difficulty})`
      ).join('\n');

      // Include transformed journal narratives (prioritize these for emotional depth)
      const journalNarratives = (journalEntries || [])
        .filter(j => j.transformed_narrative)
        .slice(0, 5)
        .map(j => `- ${j.transformed_narrative}`)
        .join('\n');

      const moodContext = avgMood
        ? `\n- Average Mood: ${avgMood}/5 (${avgMood < 2.5 ? 'struggling' : avgMood < 3.5 ? 'steady' : 'thriving'})`
        : '';

      const prompt = `You are writing Chapter ${currentChapter} of a ${profile.archetype}'s personal epic journey in an RPG-style productivity adventure.

PREVIOUS CHAPTER ENDING:
"${lastEvent}"

THIS WEEK'S QUESTS:
${questList || '(No quests completed)'}

${journalNarratives ? `INNER REFLECTIONS (Journal Entries):
${journalNarratives}

IMPORTANT: Weight these journal reflections heavily - they reveal the hero's inner emotional journey and should deeply influence the chapter's tone and narrative.
` : ''}
STATS THIS WEEK:
- Quests Completed: ${(quests || []).length}
- Journal Entries: ${journalCount}${moodContext}
- XP Gained: ${totalXP}
- Current Level: ${profile.level || 1}
- Current Streak: ${profile.current_streak || 0} days
- Easy: ${questsByDifficulty.easy}, Medium: ${questsByDifficulty.medium}, Hard: ${questsByDifficulty.hard}

Write a 250-300 word fantasy story chapter that:
1. Opens with "Previously: [one sentence recap of last chapter]"
2. Weaves both external quests AND internal journal reflections into a cohesive narrative
3. Uses journal entries to add emotional depth and inner conflict/growth
4. Shows consequences (success builds momentum, struggles create character development)
5. Ends with a cliffhanger or hint about next week's challenges
6. Uses ${profile.archetype} thematic style
7. Maintains epic fantasy tone while being emotionally authentic

Close with: "Chapter ${currentChapter} complete. Your journey continues..."

Write the chapter now:`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });

      summaryText = message.content[0].text.trim();

      // Extract last meaningful line for next week's "Previously"
      const storyLines = summaryText.split('\n').filter(line => line.trim() && !line.includes('Chapter') && !line.includes('Previously:'));
      const lastLine = storyLines[storyLines.length - 1] || "The adventure continues...";

      // Update chapter progress (advance if 70%+ weekly completion or significant journaling)
      const weeklyCompletionRate = (quests || []).length >= 5 ? (quests || []).length / 7 : 0; // Assuming 7 quests per week target
      const hasSignificantActivity = (quests || []).length >= 5 || journalCount >= 3;
      const shouldAdvanceChapter = weeklyCompletionRate >= 0.7 || hasSignificantActivity;

      await supabaseAdmin
        .from('profiles')
        .update({
          story_chapter: shouldAdvanceChapter ? currentChapter + 1 : currentChapter,
          story_last_event: lastLine.substring(0, 200) // Keep it reasonable length
        })
        .eq('id', user.id);
    } else {
      // Free: Simple progress report
      const topQuests = (quests || []).slice(0, 3).map(q => q.transformed_text);

      summaryText = `This week you completed ${(quests || []).length} quest${(quests || []).length !== 1 ? 's' : ''} and earned ${totalXP} XP!${journalCount > 0 ? ` You also wrote ${journalCount} journal entr${journalCount !== 1 ? 'ies' : 'y'}.` : ''}

${topQuests.length > 0 ? `Top quests:\n${topQuests.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}

${questsByDifficulty.hard > 0 ? `You conquered ${questsByDifficulty.hard} hard quest${questsByDifficulty.hard !== 1 ? 's' : ''} - impressive! ` : ''}${avgMood ? `Your average mood was ${avgMood}/5. ` : ''}Keep up the great work!`;
    }

    // Save summary to database
    const { data: savedSummary, error: saveError } = await supabaseAdmin
      .from('weekly_summaries')
      .insert({
        user_id: user.id,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        summary_type: isPremium ? 'premium' : 'free',
        summary_text: summaryText,
        quests_completed: quests.length,
        xp_gained: totalXP,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving summary:', saveError);
    }

    return NextResponse.json({
      summary: savedSummary || {
        summary_text: summaryText,
        quests_completed: quests.length,
        xp_gained: totalXP,
      }
    });
  } catch (error) {
    console.error('Weekly summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly summary' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // SECURITY: Authenticate via Bearer token
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekStartDate } = await request.json();

    if (!weekStartDate) {
      return NextResponse.json({ error: 'Week start date required' }, { status: 400 });
    }

    // Get user profile including story progress
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, archetype, level, current_streak, story_chapter, story_last_event')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium feature' }, { status: 403 });
    }

    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Get completed quests from that week
    const { data: quests } = await supabaseAdmin
      .from('quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)
      .gte('completed_at', weekStart.toISOString())
      .lte('completed_at', weekEnd.toISOString())
      .order('completed_at', { ascending: true });

    // Get journal entries from that week
    const { data: journalEntries } = await supabaseAdmin
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
      .order('created_at', { ascending: true });

    if ((!quests || quests.length === 0) && (!journalEntries || journalEntries.length === 0)) {
      return NextResponse.json({
        message: 'No completed quests or journal entries that week',
        questsCompleted: 0,
        journalEntriesCount: 0
      });
    }

    const totalXP = (quests || []).reduce((sum, q) => sum + (q.xp_value || 0), 0);
    const questsByDifficulty = {
      easy: (quests || []).filter(q => q.difficulty === 'easy').length,
      medium: (quests || []).filter(q => q.difficulty === 'medium').length,
      hard: (quests || []).filter(q => q.difficulty === 'hard').length,
    };

    // Calculate journal entry stats
    const journalCount = (journalEntries || []).length;
    const journalWithMood = (journalEntries || []).filter(j => j.mood !== null);
    const avgMood = journalWithMood.length > 0
      ? (journalWithMood.reduce((sum, j) => sum + j.mood, 0) / journalWithMood.length).toFixed(1)
      : null;

    // Chapter continuity for POST method
    const currentChapter = profile?.story_chapter || 1;
    const lastEvent = profile?.story_last_event || "Your journey began in the realm of forgotten tasks...";

    const questList = (quests || []).slice(0, 10).map(q =>
      `- ${q.transformed_text} (${q.difficulty})`
    ).join('\n');

    // Include transformed journal narratives (prioritize these for emotional depth)
    const journalNarratives = (journalEntries || [])
      .filter(j => j.transformed_narrative)
      .slice(0, 5)
      .map(j => `- ${j.transformed_narrative}`)
      .join('\n');

    const moodContext = avgMood
      ? `\n- Average Mood: ${avgMood}/5 (${avgMood < 2.5 ? 'struggling' : avgMood < 3.5 ? 'steady' : 'thriving'})`
      : '';

    const prompt = `You are writing Chapter ${currentChapter} of a ${profile.archetype}'s personal epic journey in an RPG-style productivity adventure.

PREVIOUS CHAPTER ENDING:
"${lastEvent}"

THIS WEEK'S QUESTS:
${questList || '(No quests completed)'}

${journalNarratives ? `INNER REFLECTIONS (Journal Entries):
${journalNarratives}

IMPORTANT: Weight these journal reflections heavily - they reveal the hero's inner emotional journey and should deeply influence the chapter's tone and narrative.
` : ''}
STATS THIS WEEK:
- Quests Completed: ${(quests || []).length}
- Journal Entries: ${journalCount}${moodContext}
- XP Gained: ${totalXP}
- Current Level: ${profile.level || 1}
- Current Streak: ${profile.current_streak || 0} days
- Easy: ${questsByDifficulty.easy}, Medium: ${questsByDifficulty.medium}, Hard: ${questsByDifficulty.hard}

Write a 250-300 word fantasy story chapter that:
1. Opens with "Previously: [one sentence recap of last chapter]"
2. Weaves both external quests AND internal journal reflections into a cohesive narrative
3. Uses journal entries to add emotional depth and inner conflict/growth
4. Shows consequences (success builds momentum, struggles create character development)
5. Ends with a cliffhanger or hint about next week's challenges
6. Uses ${profile.archetype} thematic style
7. Maintains epic fantasy tone while being emotionally authentic

Close with: "Chapter ${currentChapter} complete. Your journey continues..."

Write the chapter now:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const summaryText = message.content[0].text.trim();

    // Extract last meaningful line for next week's "Previously"
    const storyLines = summaryText.split('\n').filter(line => line.trim() && !line.includes('Chapter') && !line.includes('Previously:'));
    const lastLine = storyLines[storyLines.length - 1] || "The adventure continues...";

    // Update chapter progress (advance if 70%+ weekly completion or significant journaling)
    const weeklyCompletionRate = (quests || []).length >= 5 ? (quests || []).length / 7 : 0;
    const hasSignificantActivity = (quests || []).length >= 5 || journalCount >= 3;
    const shouldAdvanceChapter = weeklyCompletionRate >= 0.7 || hasSignificantActivity;

    await supabaseAdmin
      .from('profiles')
      .update({
        story_chapter: shouldAdvanceChapter ? currentChapter + 1 : currentChapter,
        story_last_event: lastLine.substring(0, 200)
      })
      .eq('id', user.id);

    // Save summary
    const { data: savedSummary } = await supabaseAdmin
      .from('weekly_summaries')
      .insert({
        user_id: user.id,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        summary_type: 'premium',
        summary_text: summaryText,
        quests_completed: quests.length,
        xp_gained: totalXP,
      })
      .select()
      .single();

    return NextResponse.json({ summary: savedSummary });
  } catch (error) {
    console.error('Weekly summary POST error:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly summary' },
      { status: 500 }
    );
  }
}
