/**
 * Living Companions: a creature that grows with you. One companion per
 * archetype, four life stages driven by total quests completed. The
 * companion is never sad, never dying, never disappointed. When you are
 * away it naps. When you return it is delighted. That is the whole deal.
 *
 * Replaces the old getCreatureCompanion (Guilt Golem / Procrastination
 * Wyrm), which punished inactivity. We do not do that here.
 */

export const COMPANION_SPECIES = {
  warrior: {
    species: 'Emberwolf',
    stages: [
      { emoji: '🥚', title: 'Warm Egg', name: 'A Warm Egg' },
      { emoji: '🐶', title: 'Ember Pup', name: 'Ember Pup' },
      { emoji: '🐺', title: 'Emberwolf', name: 'Emberwolf' },
      { emoji: '🦁', title: 'Blazemane', name: 'Blazemane' },
    ],
  },
  builder: {
    species: 'Ironshell',
    stages: [
      { emoji: '🥚', title: 'Stone Egg', name: 'A Stone Egg' },
      { emoji: '🐌', title: 'Pebble Snail', name: 'Pebble Snail' },
      { emoji: '🐢', title: 'Ironshell', name: 'Ironshell' },
      { emoji: '🐉', title: 'Foundation Drake', name: 'Foundation Drake' },
    ],
  },
  sage: {
    species: 'Moonowl',
    stages: [
      { emoji: '🥚', title: 'Quiet Egg', name: 'A Quiet Egg' },
      { emoji: '🐥', title: 'Downy Owlet', name: 'Downy Owlet' },
      { emoji: '🦉', title: 'Moonowl', name: 'Moonowl' },
      { emoji: '🦚', title: 'Starplume', name: 'Starplume' },
    ],
  },
  shadow: {
    species: 'Nightcat',
    stages: [
      { emoji: '🥚', title: 'Dark Egg', name: 'A Dark Egg' },
      { emoji: '🐱', title: 'Dusk Kitten', name: 'Dusk Kitten' },
      { emoji: '🐈‍⬛', title: 'Nightcat', name: 'Nightcat' },
      { emoji: '🐆', title: 'Voidpanther', name: 'Voidpanther' },
    ],
  },
  seeker: {
    species: 'Foxfire',
    stages: [
      { emoji: '🥚', title: 'Curious Egg', name: 'A Curious Egg' },
      { emoji: '🐿️', title: 'Trail Kit', name: 'Trail Kit' },
      { emoji: '🦊', title: 'Foxfire', name: 'Foxfire' },
      { emoji: '🦄', title: 'Prismfox', name: 'Prismfox' },
    ],
  },
  default: {
    species: 'Sprite',
    stages: [
      { emoji: '✨', title: 'Glimmer', name: 'A Glimmer' },
      { emoji: '✨', title: 'Sprite', name: 'Sprite' },
      { emoji: '💫', title: 'Bright Sprite', name: 'Bright Sprite' },
      { emoji: '🌟', title: 'Luminous One', name: 'Luminous One' },
    ],
  },
};

// Total quests completed needed to REACH each stage (stage 0 is free)
export const STAGE_THRESHOLDS = [0, 3, 10, 25];

/** Stage index (0-3) for a given total quest count. */
export function companionStage(questsCompleted) {
  const count = questsCompleted || 0;
  let stage = 0;
  for (let i = 0; i < STAGE_THRESHOLDS.length; i++) {
    if (count >= STAGE_THRESHOLDS[i]) stage = i;
  }
  return stage;
}

// Mood lines. Every one of these must be warm. If you are adding a line
// and it could make someone feel bad about a gap, it does not ship.
const MOODS = {
  egg: [
    'It hums softly when you complete a quest. Your progress is its heartbeat.',
    'Something inside is listening for your footsteps.',
    'It rocks gently. Every quest you finish warms the shell.',
  ],
  activeToday: [
    'is thrilled with you today. Absolutely thrilled.',
    'does a little victory circle around your feet.',
    'saw that quest. Has not stopped bouncing since.',
    'is glowing. That last quest did it.',
  ],
  recent: [
    'is padding along beside you, ready when you are.',
    'stretches, yawns, and watches the quest board with interest.',
    'is keeping your spot warm.',
  ],
  napping: [
    'is curled up napping. One quest and they spring awake.',
    'dozes peacefully. They know you always come back.',
    'is dreaming about your next adventure. No rush. They wait as long as it takes.',
  ],
};

function pick(lines, seed) {
  // Deterministic per day so the line does not flicker between renders
  let hash = 5381;
  const str = String(seed || '');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return lines[hash % lines.length];
}

/**
 * Build the living companion for a profile + quest list.
 * Returns a shape backward-compatible with the old creature object
 * ({ name, emoji, image, description }) plus stage/evolution extras.
 */
export function getCompanion(profile, quests = []) {
  const archetype = profile?.archetype;
  const def = COMPANION_SPECIES[archetype] || COMPANION_SPECIES.default;

  const questsCompleted =
    profile?.quests_completed ?? quests.filter((q) => q.completed).length ?? 0;

  const stage = companionStage(questsCompleted);
  const stageDef = def.stages[stage];

  // Next evolution teaser (null at max stage)
  const nextThreshold = STAGE_THRESHOLDS[stage + 1] ?? null;
  const nextEvolveIn = nextThreshold ? Math.max(1, nextThreshold - questsCompleted) : null;
  const nextStageTitle = nextThreshold ? def.stages[stage + 1].title : null;

  // Time-aware mood, always warm
  const todayKey = new Date().toISOString().slice(0, 10);
  let moodPool;
  if (stage === 0) {
    moodPool = MOODS.egg;
  } else {
    const last = profile?.last_quest_date ? new Date(profile.last_quest_date) : null;
    const daysSince = last ? (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
    if (daysSince < 1) moodPool = MOODS.activeToday;
    else if (daysSince < 3) moodPool = MOODS.recent;
    else moodPool = MOODS.napping;
  }
  const moodLine = pick(moodPool, `${profile?.id}:${todayKey}:${stage}`);
  const mood = stage === 0 ? moodLine : `${stageDef.name} ${moodLine}`;

  return {
    // Backward-compatible fields (CharacterPanel / CompactCharacterCard badge)
    name: stageDef.name,
    emoji: stageDef.emoji,
    image: null,
    description: mood,
    // Living-companion extras (CompanionCard)
    species: def.species,
    stage,
    stageTitle: stageDef.title,
    questsCompleted,
    nextEvolveIn,
    nextStageTitle,
    nextThreshold,
    mood,
  };
}
