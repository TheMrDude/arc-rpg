/**
 * D10 Random Encounter Table
 * Triggered after quest completion (30% chance)
 *
 * `castKey` is a purely visual field: the Storybook cast character whose art
 * fronts the encounter card (see lib/cast.js). Rolls without one (Companion
 * Gift -- that is the player's own companion) keep their emoji. Rewards,
 * ranges and rarities are untouched by cast faces.
 */

export const ENCOUNTER_TABLE = [
  {
    roll: 1,
    name: 'Shadow Trap',
    castKey: 'harlequin', // display-only face from lib/cast.js; reward logic unaffected
    icon: '🌑',
    rarity: 'common',
    description: 'A shadow trap! You lost some gold, but gained wisdom.',
    rewardType: 'gold_loss',
    rewardRange: [5, 5], // fixed loss
  },
  {
    roll: 2,
    name: 'Mysterious Fog',
    castKey: 'lantern_wisp', // display-only face from lib/cast.js; reward logic unaffected
    icon: '🌫️',
    rarity: 'common',
    description: 'The fog clears... nothing here. Keep moving, adventurer.',
    rewardType: 'none',
    rewardRange: [0, 0],
  },
  {
    roll: 3,
    name: 'Coin Pouch',
    castKey: 'satchel_raccoon', // display-only face from lib/cast.js; reward logic unaffected
    icon: '💰',
    rarity: 'common',
    description: 'You found a pouch of gold on the trail!',
    rewardType: 'gold',
    rewardRange: [10, 25],
  },
  {
    roll: 4,
    name: 'Minor Blessing',
    castKey: 'luna_monk', // display-only face from lib/cast.js; reward logic unaffected
    icon: '✨',
    rarity: 'common',
    description: 'A wandering sage blesses your path.',
    rewardType: 'bonus_xp',
    rewardRange: [5, 5],
    effectQuestsRemaining: 1,
  },
  {
    roll: 5,
    name: 'Hidden Chest',
    castKey: 'runeseeker', // display-only face from lib/cast.js; reward logic unaffected
    icon: '🗝️',
    rarity: 'uncommon',
    description: 'A hidden chest! The lock was already broken.',
    rewardType: 'gold',
    rewardRange: [25, 50],
  },
  {
    roll: 6,
    name: 'Power Surge',
    castKey: 'voltwing_chibi', // display-only face from lib/cast.js; reward logic unaffected
    icon: '⚡',
    rarity: 'uncommon',
    description: 'Energy surges through you!',
    rewardType: 'bonus_xp',
    rewardRange: [15, 15],
    effectQuestsRemaining: 1,
  },
  {
    roll: 7,
    name: 'Companion Gift',
    icon: '🐉',
    rarity: 'uncommon',
    description: 'Your companion found something shiny!',
    rewardType: 'gold',
    rewardRange: [15, 30],
  },
  {
    roll: 8,
    name: 'Rare Blessing',
    castKey: 'celeste', // display-only face from lib/cast.js; reward logic unaffected
    icon: '🌟',
    rarity: 'rare',
    description: 'A powerful blessing settles over you.',
    rewardType: 'bonus_xp',
    rewardRange: [10, 10],
    effectQuestsRemaining: 2,
  },
  {
    roll: 9,
    name: 'Treasure Trove',
    castKey: 'forge_cat', // display-only face from lib/cast.js; reward logic unaffected
    icon: '💎',
    rarity: 'rare',
    description: 'Jackpot! A hidden treasure trove!',
    rewardType: 'gold',
    rewardRange: [50, 100],
  },
  {
    roll: 10,
    name: 'CRITICAL HIT',
    castKey: 'emberling', // display-only face from lib/cast.js; reward logic unaffected
    icon: '🔥',
    rarity: 'legendary',
    description: 'CRITICAL HIT! The legends will speak of this moment!',
    rewardType: 'critical_hit',
    rewardRange: [100, 100], // 100 gold + 2x XP on next quest
    effectQuestsRemaining: 1,
  },
];

export const RARITY_COLORS = {
  common: { glow: 'rgba(148, 163, 184, 0.5)', border: '#94a3b8', text: '#94a3b8' },
  uncommon: { glow: 'rgba(34, 197, 94, 0.6)', border: '#22c55e', text: '#22c55e' },
  rare: { glow: 'rgba(168, 85, 247, 0.7)', border: '#a855f7', text: '#a855f7' },
  legendary: { glow: 'rgba(234, 179, 8, 0.8)', border: '#eab308', text: '#eab308' },
};

/**
 * Get encounter by roll value (1-10)
 */
export function getEncounter(roll) {
  return ENCOUNTER_TABLE.find(e => e.roll === roll) || ENCOUNTER_TABLE[1]; // default to fog
}

/**
 * Calculate the actual reward value from a range
 */
export function calculateRewardValue(rewardRange) {
  const [min, max] = rewardRange;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
