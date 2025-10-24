import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

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

// POST - Generate quests from active templates
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

    // Check if user is premium
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, archetype')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.subscription_status === 'active';

    if (!isPremium) {
      return NextResponse.json({
        error: 'Premium feature',
        message: 'Recurring quest generation is a premium feature'
      }, { status: 403 });
    }

    // Get active templates
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('recurring_quest_templates')
      .select(`
        *,
        tasks:template_tasks(*)
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({
        message: 'No active templates to generate from',
        questsCreated: 0
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let totalQuestsCreated = 0;
    const createdQuests = [];

    // Process each template
    for (const template of templates) {
      // Check if we should generate from this template
      const shouldGenerate = await checkShouldGenerate(template, today);

      if (!shouldGenerate) {
        continue;
      }

      // Generate quests from template tasks
      for (const task of template.tasks) {
        try {
          // Transform task with AI
          const archetypeStyles = {
            warrior: 'Transform this into a heroic battle or conquest. Use bold, action-oriented language.',
            builder: 'Transform this into a construction or creation project. Use engineering and crafting language.',
            shadow: 'Transform this into a stealth mission or cunning strategy. Use mysterious, strategic language.',
            sage: 'Transform this into a quest for knowledge or wisdom. Use mystical, intellectual language.',
            seeker: 'Transform this into an exploration or discovery adventure. Use curious, adventurous language.',
          };

          const prompt = `You are a quest generator for an RPG game.

Archetype: ${profile.archetype?.toUpperCase() || 'WARRIOR'}
Style: ${archetypeStyles[profile.archetype] || archetypeStyles.warrior}
Difficulty: ${task.difficulty}

Original task: "${task.task_text}"

Transform this boring task into an epic RPG quest. Keep it to 1-2 sentences. Make it exciting and match the archetype style.

Quest:`;

          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 150,
            messages: [{ role: 'user', content: prompt }],
          });

          const transformedText = message.content[0].text.trim();

          // Calculate XP
          const xpValues = { easy: 10, medium: 25, hard: 50 };
          const xp = xpValues[task.difficulty];

          // Create quest
          const { data: quest, error: questError } = await supabaseAdmin
            .from('quests')
            .insert({
              user_id: user.id,
              original_text: task.task_text,
              transformed_text: transformedText,
              difficulty: task.difficulty,
              xp_value: xp,
              completed: false,
            })
            .select()
            .single();

          if (questError) {
            console.error('Error creating quest from template:', questError);
            continue;
          }

          createdQuests.push(quest);
          totalQuestsCreated++;

        } catch (aiError) {
          console.error('AI transformation error:', aiError);
          // Create quest without transformation as fallback
          const xpValues = { easy: 10, medium: 25, hard: 50 };
          const xp = xpValues[task.difficulty];

          await supabaseAdmin
            .from('quests')
            .insert({
              user_id: user.id,
              original_text: task.task_text,
              transformed_text: task.task_text, // Fallback to original
              difficulty: task.difficulty,
              xp_value: xp,
              completed: false,
            });

          totalQuestsCreated++;
        }
      }

      // Log generation
      await supabaseAdmin
        .from('template_generation_log')
        .insert({
          template_id: template.id,
          generated_at: now,
          quests_created: template.tasks.length,
        });
    }

    console.log('Quests generated from templates', {
      userId: user.id,
      templatesProcessed: templates.length,
      questsCreated: totalQuestsCreated,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: `Generated ${totalQuestsCreated} quests from ${templates.length} templates`,
      questsCreated: totalQuestsCreated,
      quests: createdQuests,
    });

  } catch (error) {
    console.error('Generate from templates error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to check if template should generate today
async function checkShouldGenerate(template, today) {
  // Get last generation log
  const { data: lastLog } = await supabaseAdmin
    .from('template_generation_log')
    .select('*')
    .eq('template_id', template.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastLog) {
    return true; // Never generated, generate now
  }

  const lastGenerated = new Date(lastLog.generated_at);
  const lastGeneratedDate = new Date(
    lastGenerated.getFullYear(),
    lastGenerated.getMonth(),
    lastGenerated.getDate()
  );

  const diffDays = Math.floor((today - lastGeneratedDate) / (1000 * 60 * 60 * 24));

  switch (template.recurrence_type) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'custom':
      return diffDays >= template.recurrence_interval;
    default:
      return false;
  }
}
