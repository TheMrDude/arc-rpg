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
    lore: 'Born from a coal that refused to go out.',
    stages: [
      { emoji: '🥚', title: 'Warm Egg', name: 'A Warm Egg', image: '/images/companions/warrior/0.png' },
      { emoji: '🐶', title: 'Ember Pup', name: 'Ember Pup', image: '/images/companions/warrior/1.png' },
      { emoji: '🐺', title: 'Emberwolf', name: 'Emberwolf', image: '/images/companions/warrior/2.png' },
      { emoji: '🦁', title: 'Blazemane', name: 'Blazemane', image: '/images/companions/warrior/3.png' },
    ],
  },
  builder: {
    species: 'Runescale',
    lore: 'Sets one stone a day, and never takes it back.',
    stages: [
      { emoji: '🥚', title: 'Stone Egg', name: 'A Stone Egg', image: '/images/companions/builder/0.png' },
      { emoji: '🦎', title: 'Pebblet', name: 'Pebblet', image: '/images/companions/builder/1.png' },
      { emoji: '🐲', title: 'Runescale', name: 'Runescale', image: '/images/companions/builder/2.png' },
      { emoji: '🐉', title: 'Foundation Drake', name: 'Foundation Drake', image: '/images/companions/builder/3.png' },
    ],
  },
  sage: {
    species: 'Moonowl',
    lore: 'Sleeps through the noise. Wakes for the quiet questions.',
    stages: [
      { emoji: '🥚', title: 'Quiet Egg', name: 'A Quiet Egg' },
      { emoji: '🐥', title: 'Downy Owlet', name: 'Downy Owlet', image: '/images/companions/sage/1.png' },
      { emoji: '🦉', title: 'Moonowl', name: 'Moonowl', image: '/images/companions/sage/2.png' },
      { emoji: '🦚', title: 'Starplume', name: 'Starplume', image: '/images/companions/sage/3.png' },
    ],
  },
  shadow: {
    species: 'Nightcat',
    lore: 'Moves first. Gets noticed second.',
    stages: [
      { emoji: '🥚', title: 'Dark Egg', name: 'A Dark Egg' },
      { emoji: '🐱', title: 'Dusk Kitten', name: 'Dusk Kitten', image: '/images/companions/shadow/1.png' },
      { emoji: '🐈‍⬛', title: 'Nightcat', name: 'Nightcat', image: '/images/companions/shadow/2.png' },
      { emoji: '🐆', title: 'Voidpanther', name: 'Voidpanther', image: '/images/companions/shadow/3.png' },
    ],
  },
  seeker: {
    species: 'Foxfire',
    lore: 'Follows every path twice, in case it changed.',
    stages: [
      { emoji: '🥚', title: 'Curious Egg', name: 'A Curious Egg', image: '/images/companions/seeker/0.png' },
      { emoji: '🐿️', title: 'Trail Kit', name: 'Trail Kit', image: '/images/companions/seeker/1.png' },
      { emoji: '🦊', title: 'Foxfire', name: 'Foxfire', image: '/images/companions/seeker/2.png' },
      { emoji: '🦄', title: 'Prismfox', name: 'Prismfox', image: '/images/companions/seeker/3.png' },
    ],
  },
  default: {
    species: 'Sprite',
    lore: 'Small, bright, and stubbornly awake.',
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
  // A user-chosen name wins everywhere the companion is referred to, including
  // the mood line -- "Sparkle is napping" rather than "Ember Pup is napping".
  // NULL/blank falls back to the species stage name, so unnamed companions and
  // every existing user are unchanged.
  const custom = typeof profile?.companion_name === 'string' ? profile.companion_name.trim() : '';
  const displayName = custom || stageDef.name;

  const moodLine = pick(moodPool, `${profile?.id}:${todayKey}:${stage}`);

  // Stages 1-3 read as "<name> is thrilled with you today", so the name simply
  // leads. Stage 0 is different: the egg lines are complete sentences that refer
  // to the companion in the third person ("It rocks gently...", "Something
  // inside is listening..."), so prefixing a name would be ungrammatical.
  //
  // This matters more than it looks. Naming happens at the hatch, so a stage-0
  // companion is normally unnamed and these lines are correct as written. But a
  // user can rename from the card at any time, and a renamed egg with a nameless
  // mood line would show the name in two of three places. Substituting the
  // pronoun keeps all three consistent. A line matching neither pattern renders
  // unchanged.
  let mood;
  if (stage === 0) {
    mood = custom
      ? moodLine
          .replace(/^It\b/, displayName)
          .replace(/^Something inside\b/, `Something inside ${displayName}`)
      : moodLine;
  } else {
    mood = `${displayName} ${moodLine}`;
  }

  return {
    // Backward-compatible fields (CharacterPanel portrait + title)
    name: displayName,
    // The species stage name, regardless of naming. Used as the prefilled
    // default in the naming prompt and to show what the creature actually is
    // once it has a nickname.
    speciesName: stageDef.name,
    customName: custom || null,
    emoji: stageDef.emoji,
    // Per-species, per-stage art. `image` is the full render for the large
    // showcase (companion card heading). `portrait` is used where the art is
    // shown small (the ~70px character-panel circle, the 20px badge): it
    // prefers an optional tight face/bust crop and otherwise reuses the full
    // render. Both are null until art exists for this stage, so any species or
    // stage with no art simply keeps rendering `emoji` -- partial coverage is
    // the normal case while art is added one line at a time.
    image: stageDef.image || null,
    portrait: stageDef.portrait || stageDef.image || null,
    description: mood,
    // Living-companion extras (CompanionCard)
    species: def.species,
    lore: def.lore,
    stage,
    stageTitle: stageDef.title,
    questsCompleted,
    nextEvolveIn,
    nextStageTitle,
    nextThreshold,
    mood,
  };
}
