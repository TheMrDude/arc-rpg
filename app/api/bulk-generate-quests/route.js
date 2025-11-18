import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for bulk generation

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ARCHETYPES = ['Warrior', 'Mage', 'Rogue', 'Cleric', 'Bard', 'Ranger'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const CATEGORIES = ['productivity', 'health', 'learning', 'social', 'creativity', 'finance'];

export async function POST(request) {
  try {
    const { batchSize = 50, archetype = null } = await request.json();

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ADMIN ONLY - This burns through API credits!
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const generatedQuests = [];
    const targetArchetypes = archetype ? [archetype] : ARCHETYPES;

    // Generate quests for each archetype
    for (const targetArchetype of targetArchetypes) {
      const questsPerDifficulty = Math.ceil(batchSize / DIFFICULTIES.length / targetArchetypes.length);

      for (const difficulty of DIFFICULTIES) {
        const prompt = `You are a master quest designer for an RPG habit-tracking app called HabitQuest.

Generate ${questsPerDifficulty} unique real-life tasks that would suit a ${targetArchetype} archetype at ${difficulty} difficulty.

ARCHETYPE TRAITS:
- Warrior: Physical challenges, discipline, strength-building, confrontation, courage
- Mage: Mental challenges, learning, research, analysis, wisdom-building
- Rogue: Creative challenges, flexibility, networking, resourcefulness, quick thinking
- Cleric: Helping others, healing, community service, compassion, support
- Bard: Social challenges, creativity, performance, inspiration, communication
- Ranger: Nature, exploration, independence, observation, preparation

DIFFICULTY GUIDELINES:
- easy: 5-15 minutes, simple tasks, daily habits
- medium: 30-60 minutes, moderate effort, weekly goals
- hard: 2+ hours, significant effort, challenging projects

CATEGORIES: ${CATEGORIES.join(', ')}

For each quest, provide:
1. ORIGINAL: The plain task description (5-10 words)
2. TRANSFORMED: An epic RPG narrative version (1-2 sentences, exciting and thematic)
3. STORY: A brief story thread it could belong to
4. IMPACT: The narrative impact of completing it
5. CATEGORY: Which life category it belongs to
6. XP: Appropriate XP value (easy: 10-15, medium: 20-30, hard: 40-60)

Format EXACTLY as:
---
QUEST ${difficulty.toUpperCase()}
ORIGINAL: [plain task]
TRANSFORMED: [epic narrative version]
STORY: [story thread]
IMPACT: [narrative impact]
CATEGORY: [category]
XP: [number]
---

Generate ${questsPerDifficulty} quests now:`;

        try {
          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            messages: [{ role: 'user', content: prompt }],
          });

          const response = message.content[0].text.trim();

          // Parse the generated quests
          const questBlocks = response.split('---').filter(block => block.trim());

          for (const block of questBlocks) {
            const originalMatch = block.match(/ORIGINAL:\s*(.+)/);
            const transformedMatch = block.match(/TRANSFORMED:\s*(.+)/);
            const storyMatch = block.match(/STORY:\s*(.+)/);
            const impactMatch = block.match(/IMPACT:\s*(.+)/);
            const categoryMatch = block.match(/CATEGORY:\s*(\w+)/);
            const xpMatch = block.match(/XP:\s*(\d+)/);

            if (originalMatch && transformedMatch) {
              const quest = {
                archetype: targetArchetype,
                difficulty: difficulty,
                original_text: originalMatch[1].trim(),
                transformed_text: transformedMatch[1].trim(),
                story_thread: storyMatch ? storyMatch[1].trim() : null,
                narrative_impact: impactMatch ? impactMatch[1].trim() : null,
                category: categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'productivity',
                xp_value: xpMatch ? parseInt(xpMatch[1]) : (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50),
              };

              generatedQuests.push(quest);
            }
          }
        } catch (err) {
          console.error(`Failed to generate ${difficulty} quests for ${targetArchetype}:`, err);
        }
      }
    }

    // Insert into database
    const { data: insertedQuests, error: insertError } = await supabase
      .from('quest_templates')
      .insert(generatedQuests)
      .select();

    if (insertError) {
      console.error('Failed to insert templates:', insertError);
      return NextResponse.json({ error: 'Failed to save templates' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      generated: insertedQuests.length,
      breakdown: {
        total: insertedQuests.length,
        byArchetype: ARCHETYPES.reduce((acc, arch) => {
          acc[arch] = insertedQuests.filter(q => q.archetype === arch).length;
          return acc;
        }, {}),
        byDifficulty: DIFFICULTIES.reduce((acc, diff) => {
          acc[diff] = insertedQuests.filter(q => q.difficulty === diff).length;
          return acc;
        }, {}),
      }
    });

  } catch (error) {
    console.error('Bulk generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quest templates' },
      { status: 500 }
    );
  }
}

// Get available templates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const archetype = searchParams.get('archetype');
    const difficulty = searchParams.get('difficulty');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('quest_templates')
      .select('*')
      .order('used_count', { ascending: true }) // Prefer less-used templates
      .limit(limit);

    if (archetype) query = query.eq('archetype', archetype);
    if (difficulty) query = query.eq('difficulty', difficulty);
    if (category) query = query.eq('category', category);

    const { data: templates, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    });

  } catch (error) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
