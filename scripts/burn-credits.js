#!/usr/bin/env node
/**
 * CREDIT BURNER SCRIPT
 * Run this to use up your Anthropic credits before they expire!
 *
 * Usage:
 *   node scripts/burn-credits.js [number_of_batches]
 *
 * Example:
 *   node scripts/burn-credits.js 15
 *
 * This will generate 15 batches of 60 quests each = 900 total quests
 * Each batch costs ~$2-4 in credits
 * 15 batches = ~$30-60 in credits used
 */

const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

async function generateQuestBatch(archetype, difficulty, count = 10) {
  const prompt = `You are a master quest designer for an RPG habit-tracking app called HabitQuest.

Generate ${count} unique real-life tasks that would suit a ${archetype} archetype at ${difficulty} difficulty.

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

Generate ${count} quests now:`;

  console.log(`  Generating ${count} ${difficulty} quests for ${archetype}...`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const response = message.content[0].text.trim();
  const questBlocks = response.split('---').filter(block => block.trim());
  const quests = [];

  for (const block of questBlocks) {
    const originalMatch = block.match(/ORIGINAL:\s*(.+)/);
    const transformedMatch = block.match(/TRANSFORMED:\s*(.+)/);
    const storyMatch = block.match(/STORY:\s*(.+)/);
    const impactMatch = block.match(/IMPACT:\s*(.+)/);
    const categoryMatch = block.match(/CATEGORY:\s*(\w+)/);
    const xpMatch = block.match(/XP:\s*(\d+)/);

    if (originalMatch && transformedMatch) {
      quests.push({
        archetype: archetype,
        difficulty: difficulty,
        original_text: originalMatch[1].trim(),
        transformed_text: transformedMatch[1].trim(),
        story_thread: storyMatch ? storyMatch[1].trim() : null,
        narrative_impact: impactMatch ? impactMatch[1].trim() : null,
        category: categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'productivity',
        xp_value: xpMatch ? parseInt(xpMatch[1]) : (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 25 : 50),
      });
    }
  }

  return quests;
}

async function burnCredits(numBatches = 10) {
  console.log(`\n🔥 CREDIT BURNER STARTING 🔥`);
  console.log(`Target: ${numBatches} batches of ~60 quests each`);
  console.log(`Estimated credits to burn: $${numBatches * 3} - $${numBatches * 4}\n`);

  let totalGenerated = 0;
  const startTime = Date.now();

  for (let batch = 1; batch <= numBatches; batch++) {
    console.log(`\n📦 BATCH ${batch}/${numBatches}`);
    const batchQuests = [];

    for (const archetype of ARCHETYPES) {
      for (const difficulty of DIFFICULTIES) {
        try {
          const quests = await generateQuestBatch(archetype, difficulty, 3);
          batchQuests.push(...quests);
          console.log(`    ✓ ${archetype} ${difficulty}: ${quests.length} quests`);
        } catch (error) {
          console.error(`    ✗ ${archetype} ${difficulty} failed:`, error.message);
        }
      }
    }

    // Insert into database
    if (batchQuests.length > 0) {
      try {
        const { data, error } = await supabase
          .from('quest_templates')
          .insert(batchQuests);

        if (error) {
          console.error(`  ⚠️  Database insert failed:`, error.message);
        } else {
          console.log(`  ✅ Saved ${batchQuests.length} quests to database`);
          totalGenerated += batchQuests.length;
        }
      } catch (error) {
        console.error(`  ⚠️  Database error:`, error.message);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const estimatedTotal = (elapsed / batch) * numBatches;
    const remaining = estimatedTotal - elapsed;

    console.log(`  ⏱️  Elapsed: ${elapsed}s | Remaining: ~${remaining.toFixed(0)}s`);
    console.log(`  📊 Total quests generated: ${totalGenerated}`);

    // Small delay between batches to avoid rate limits
    if (batch < numBatches) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const estimatedCost = (numBatches * 3.5).toFixed(2);

  console.log(`\n🎉 COMPLETE!`);
  console.log(`✅ Generated ${totalGenerated} quest templates`);
  console.log(`⏱️  Total time: ${totalTime}s`);
  console.log(`💰 Estimated cost: ~$${estimatedCost}`);
  console.log(`\nQuest templates are now available in your database!\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const numBatches = parseInt(args[0]) || 10;

if (numBatches < 1 || numBatches > 100) {
  console.error('Error: Number of batches must be between 1 and 100');
  process.exit(1);
}

// Run the burner
burnCredits(numBatches).catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
