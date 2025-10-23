import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Force dynamic rendering to prevent caching of authenticated requests
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Verify user is authenticated
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, archetype')
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

    if (!quests || quests.length === 0) {
      return NextResponse.json({
        message: 'No completed quests this week yet',
        questsCompleted: 0
      });
    }

    // Calculate stats
    const totalXP = quests.reduce((sum, q) => sum + (q.xp_value || 0), 0);
    const questsByDifficulty = {
      easy: quests.filter(q => q.difficulty === 'easy').length,
      medium: quests.filter(q => q.difficulty === 'medium').length,
      hard: quests.filter(q => q.difficulty === 'hard').length,
    };

    // Generate AI summary
    let summaryText = '';

    if (isPremium) {
      // Premium: Epic narrative summary
      const questList = quests.slice(0, 10).map(q =>
        `- ${q.transformed_text} (${q.difficulty})`
      ).join('\n');

      const prompt = `You are an epic storyteller and Dungeon Master narrating a hero's weekly adventures.

Hero Archetype: ${profile.archetype.toUpperCase()}
Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}

Completed Quests:
${questList}

Stats:
- Total XP Earned: ${totalXP}
- Quests Completed: ${quests.length}
- Easy: ${questsByDifficulty.easy}, Medium: ${questsByDifficulty.medium}, Hard: ${questsByDifficulty.hard}

Write an EPIC 4-5 sentence narrative summary of this hero's week. Make it dramatic, personal, and inspiring. Reference specific quests and celebrate their achievements. Make them feel like a legendary hero.

Weekly Summary:`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      });

      summaryText = message.content[0].text.trim();
    } else {
      // Free: Simple progress report
      const topQuests = quests.slice(0, 3).map(q => q.transformed_text);

      summaryText = `This week you completed ${quests.length} quest${quests.length !== 1 ? 's' : ''} and earned ${totalXP} XP!

Top quests:
${topQuests.map((q, i) => `${i + 1}. ${q}`).join('\n')}

${questsByDifficulty.hard > 0 ? `You conquered ${questsByDifficulty.hard} hard quest${questsByDifficulty.hard !== 1 ? 's' : ''} - impressive! ` : ''}Keep up the great work!`;
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

    // Update story progress
    if (isPremium) {
      const { data: storyProgress } = await supabaseAdmin
        .from('story_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (storyProgress) {
        await supabaseAdmin
          .from('story_progress')
          .update({
            last_summary_generated: new Date().toISOString(),
            total_summaries: (storyProgress.total_summaries || 0) + 1,
          })
          .eq('user_id', user.id);
      }
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
    // Allow manual summary generation for past weeks
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekStartDate } = await request.json();

    if (!weekStartDate) {
      return NextResponse.json({ error: 'Week start date required' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, archetype')
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

    if (!quests || quests.length === 0) {
      return NextResponse.json({
        message: 'No completed quests that week',
        questsCompleted: 0
      });
    }

    const totalXP = quests.reduce((sum, q) => sum + (q.xp_value || 0), 0);
    const questsByDifficulty = {
      easy: quests.filter(q => q.difficulty === 'easy').length,
      medium: quests.filter(q => q.difficulty === 'medium').length,
      hard: quests.filter(q => q.difficulty === 'hard').length,
    };

    const questList = quests.slice(0, 10).map(q =>
      `- ${q.transformed_text} (${q.difficulty})`
    ).join('\n');

    const prompt = `You are an epic storyteller and Dungeon Master narrating a hero's weekly adventures.

Hero Archetype: ${profile.archetype.toUpperCase()}
Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}

Completed Quests:
${questList}

Stats:
- Total XP Earned: ${totalXP}
- Quests Completed: ${quests.length}
- Easy: ${questsByDifficulty.easy}, Medium: ${questsByDifficulty.medium}, Hard: ${questsByDifficulty.hard}

Write an EPIC 4-5 sentence narrative summary of this hero's week. Make it dramatic, personal, and inspiring. Reference specific quests and celebrate their achievements. Make them feel like a legendary hero.

Weekly Summary:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const summaryText = message.content[0].text.trim();

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
