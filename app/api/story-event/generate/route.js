import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/api-auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Random story event types
const EVENT_TYPES = {
  treasure_found: {
    weight: 15,
    rewards: { gold: [50, 150], xp: [10, 50] },
    emoji: '💎',
    titles: [
      'Hidden Treasure Discovered!',
      'Ancient Chest Unearthed!',
      'Fortune Favors the Bold!',
      'Treasure Trove Found!',
    ],
    descriptions: [
      'While exploring, you stumbled upon a hidden cache of gold and valuable items!',
      'Your keen eye spotted a glinting treasure half-buried in the ruins.',
      'A mysterious chest appears before you, filled with riches beyond imagination!',
      'Lucky day! You found a forgotten stash of gold from an ancient adventurer.',
    ],
  },
  npc_encounter: {
    weight: 20,
    rewards: { gold: [0, 100], xp: [20, 100] },
    emoji: '🧙',
    npcs: [
      { name: 'Eldrin the Wise', description: 'An ancient sage who shares forgotten knowledge' },
      { name: 'Kara Swiftblade', description: 'A legendary warrior offering combat training' },
      { name: 'Mysterious Stranger', description: 'A hooded figure with valuable information' },
      { name: 'Merchant Guildmaster', description: 'A wealthy trader with rare goods' },
      { name: 'Oracle of Shadows', description: 'A seer who reveals glimpses of your destiny' },
    ],
  },
  plot_twist: {
    weight: 10,
    rewards: { gold: [0, 0], xp: [50, 150] },
    emoji: '⚡',
    titles: [
      'The Truth Revealed!',
      'Everything Changes!',
      'Unexpected Discovery!',
      'The Plot Thickens!',
    ],
    descriptions: [
      'A shocking revelation changes everything you thought you knew about your quest.',
      'The pieces suddenly fall into place, revealing a much larger conspiracy.',
      'What you believed to be true was merely a facade. The real story begins now.',
      'A crucial piece of information comes to light, altering your path forward.',
    ],
  },
  rival_challenge: {
    weight: 15,
    rewards: { gold: [100, 300], xp: [100, 200] },
    emoji: '⚔️',
    titles: [
      'Rival Appears!',
      'Challenge Accepted!',
      'Worthy Opponent!',
      'Duel of Fates!',
    ],
    descriptions: [
      'A formidable rival challenges you to prove your worth in combat!',
      'Your reputation has attracted the attention of a legendary duelist.',
      'A competitor seeks to test their skills against yours in an epic showdown.',
      'The arena erupts as your rival steps forward, weapon drawn.',
    ],
  },
  divine_blessing: {
    weight: 8,
    rewards: { gold: [0, 0], xp: [100, 300] },
    emoji: '✨',
    titles: [
      'Divine Intervention!',
      'Blessed by the Gods!',
      'Miracle Occurs!',
      'Heaven-Sent Gift!',
    ],
    descriptions: [
      'The gods smile upon you, granting a powerful blessing for your journey.',
      'A divine light envelops you, filling you with incredible power and purpose.',
      'Your dedication has caught the attention of the divine realms.',
      'Ancient powers recognize your valor and bestow a sacred gift.',
    ],
  },
  betrayal: {
    weight: 7,
    rewards: { gold: [-50, 0], xp: [50, 100] },
    emoji: '🗡️',
    titles: [
      'Betrayed!',
      'Trust Shattered!',
      'Deception Revealed!',
      'The Knife in the Back!',
    ],
    descriptions: [
      'Someone you trusted has betrayed you! But adversity breeds strength.',
      'The alliance was a lie. Now you must forge ahead alone, wiser and stronger.',
      'Betrayal cuts deep, but it tempers your resolve like steel in fire.',
      'You discover treachery among your ranks. The path ahead grows darker.',
    ],
  },
  mysterious_artifact: {
    weight: 12,
    rewards: { gold: [0, 0], xp: [75, 150] },
    emoji: '🔮',
    titles: [
      'Artifact Uncovered!',
      'Relic of Power!',
      'Ancient Mystery!',
      'Legendary Discovery!',
    ],
    descriptions: [
      'You discover a mysterious artifact pulsing with ancient magic.',
      'A relic from a forgotten age calls out to you, promising great power.',
      'Your quest leads you to an artifact spoken of only in legends.',
      'The artifact resonates with your spirit, forming an unbreakable bond.',
    ],
  },
  prophetic_vision: {
    weight: 8,
    rewards: { gold: [0, 0], xp: [60, 120] },
    emoji: '👁️',
    titles: [
      'Vision Granted!',
      'The Future Revealed!',
      'Prophetic Dream!',
      'Glimpse of Destiny!',
    ],
    descriptions: [
      'A powerful vision shows you glimpses of events yet to come.',
      'In your dreams, the fabric of time parts to reveal your destiny.',
      'The universe itself speaks to you through visions and portents.',
      'Ancient wisdom floods your mind, showing you the path ahead.',
    ],
  },
  comic_relief: {
    weight: 15,
    rewards: { gold: [20, 80], xp: [10, 40] },
    emoji: '😂',
    titles: [
      'Comedic Chaos!',
      'Hilarious Mishap!',
      'Unexpected Humor!',
      'Comedy of Errors!',
    ],
    descriptions: [
      'A series of ridiculous events unfolds, but somehow you come out ahead!',
      'Even heroes need a laugh! This absurd situation lightens your journey.',
      'Not every adventure needs to be serious. This comic episode brings joy.',
      'Sometimes the best stories are the funny ones. This is one for the tavern!',
    ],
  },
};

// Generate a random story event
export async function POST(request) {
  try {
    const { user, error: authError } = await authenticateRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('level, archetype, current_story_thread, story_progress')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has had an event recently (max 1 per day)
    const { data: recentEvents } = await supabaseAdmin
      .from('story_events')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      return NextResponse.json({
        error: 'Rate limited',
        message: 'You can only receive one story event per day'
      }, { status: 429 });
    }

    // Select random event type based on weights
    const totalWeight = Object.values(EVENT_TYPES).reduce((sum, type) => sum + type.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedType = null;

    for (const [type, config] of Object.entries(EVENT_TYPES)) {
      random -= config.weight;
      if (random <= 0) {
        selectedType = type;
        break;
      }
    }

    const eventConfig = EVENT_TYPES[selectedType];

    // Generate event details
    let eventData = {
      type: selectedType,
      emoji: eventConfig.emoji,
    };

    if (eventConfig.titles) {
      eventData.title = eventConfig.titles[Math.floor(Math.random() * eventConfig.titles.length)];
      eventData.description = eventConfig.descriptions[Math.floor(Math.random() * eventConfig.descriptions.length)];
    }

    if (eventConfig.npcs) {
      const npc = eventConfig.npcs[Math.floor(Math.random() * eventConfig.npcs.length)];
      eventData.npc_name = npc.name;
      eventData.npc_description = npc.description;
      eventData.title = `You encountered ${npc.name}!`;
      eventData.description = npc.description;
    }

    // Calculate rewards
    const rewards = {};
    if (eventConfig.rewards.gold) {
      const [min, max] = eventConfig.rewards.gold;
      rewards.gold = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    if (eventConfig.rewards.xp) {
      const [min, max] = eventConfig.rewards.xp;
      rewards.xp = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Award rewards
    if (rewards.gold && rewards.gold !== 0) {
      await supabaseAdmin.rpc('process_gold_transaction', {
        p_user_id: user.id,
        p_amount: rewards.gold,
        p_transaction_type: 'story_event',
        p_reference_id: selectedType,
        p_metadata: { event_type: selectedType }
      });
    }

    if (rewards.xp && rewards.xp > 0) {
      const newXP = profile.xp + rewards.xp;
      const newLevel = Math.floor(newXP / 100) + 1;

      await supabaseAdmin
        .from('profiles')
        .update({
          xp: newXP,
          level: newLevel,
        })
        .eq('id', user.id);

      rewards.level_up = newLevel > profile.level;
      rewards.new_level = newLevel;
    }

    // Add NPC to story progress if applicable
    if (eventData.npc_name) {
      const storyProgress = profile.story_progress || { npcs_met: [] };
      if (!storyProgress.npcs_met.includes(eventData.npc_name)) {
        storyProgress.npcs_met.push(eventData.npc_name);

        await supabaseAdmin
          .from('profiles')
          .update({ story_progress: storyProgress })
          .eq('id', user.id);
      }
    }

    // Create event record
    await supabaseAdmin
      .from('story_events')
      .insert({
        user_id: user.id,
        event_type: selectedType,
        event_data: eventData,
        rewards: rewards,
      });

    console.log('Story event generated:', {
      userId: user.id,
      eventType: selectedType,
      rewards,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      event: {
        ...eventData,
        rewards,
      }
    });

  } catch (error) {
    console.error('Story event generation error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
