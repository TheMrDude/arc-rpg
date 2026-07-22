/**
 * Legendary Badges — shared definitions (client + metadata API).
 *
 * These are permanent milestone trophies. NOTHING here is streak-based:
 * every milestone is a lifetime count or a one-time unlock event, in line
 * with HabitQuest's no-streaks/no-guilt promise. The word "NFT" is
 * deliberately absent from all user-facing copy — in-app these are
 * "Legendary Badges"; the chain is an implementation detail.
 *
 * The on-chain badgeId is the numeric `id`. Keep it in sync with the
 * contract deploy script (contracts/script/Deploy.s.sol) and the metadata
 * route (app/api/badges/[badgeId]).
 */

import { WORLD_REGIONS, getUnlockStatus } from './world-regions';

/** Feature flag — everything badge-related ships dark until Dan flips this. */
export const BADGES_ENABLED = process.env.NEXT_PUBLIC_BADGES_ENABLED === 'true';

/**
 * v1 badge set. `color`/`accent` drive the placeholder SVG shield art
 * (final art comes from Canva later). `milestone` is the short, on-chain
 * attribute; `earnHint` is the unearned-state nudge shown under silhouettes.
 */
export const BADGES = [
  {
    id: 1,
    key: 'first-light',
    name: 'First Light',
    emoji: '🌅',
    color: '#FFB627',
    accent: '#FFE08A',
    milestone: 'First 7 quest completions',
    tagline: 'The journey has well and truly begun.',
    description:
      'Awarded for your first 7 completed quests. The moment habit-building stopped being an idea and started being something you actually do.',
    earnHint: 'Complete 7 quests to earn this.',
  },
  {
    id: 2,
    key: 'cartographer',
    name: 'Cartographer',
    emoji: '🗺️',
    color: '#2FA98C',
    accent: '#8FE3D0',
    milestone: 'First new map region unlocked',
    tagline: 'The map remembers where you have been.',
    description:
      'Awarded when you unlock your first new region of the world map beyond your starting lands. Your consistency literally opened up new ground.',
    earnHint: 'Unlock your first new map region to earn this.',
  },
  {
    id: 3,
    key: 'bossbreaker',
    name: 'Bossbreaker',
    emoji: '⚔️',
    color: '#E4572E',
    accent: '#FF9A76',
    milestone: 'First boss battle won',
    tagline: 'Whatever it whispered, it whispers no more.',
    description:
      'Awarded for defeating your first weekly boss — the Procrastination Wraith, the Doomscroll Serpent, or whichever one you faced down. A week of small wins, one big victory.',
    earnHint: 'Defeat your first weekly boss to earn this.',
  },
  {
    id: 4,
    key: 'the-long-road',
    name: 'The Long Road',
    emoji: '🛤️',
    color: '#7C6BAC',
    accent: '#C0B4E6',
    milestone: '100 lifetime completions',
    tagline: 'Not a streak. A hundred separate choices to show up.',
    description:
      'Awarded for 100 completed quests over your lifetime — counted in total, never consecutively. Miss a day, miss a week; every completion still counts toward this, forever.',
    earnHint: 'Reach 100 lifetime quest completions to earn this.',
  },
  {
    id: 5,
    key: 'worldwalker',
    name: 'Worldwalker',
    emoji: '🌍',
    color: '#C9A227',
    accent: '#F2D680',
    milestone: 'Full world map revealed',
    tagline: 'Every region, every road. The whole world, walked.',
    description:
      'Awarded for revealing the entire world map — every last region unlocked. The rarest badge in the set, and proof of a very long journey.',
    earnHint: 'Unlock every region of the world map to earn this.',
  },
];

/** Look up a badge by its numeric on-chain id. */
export function getBadge(badgeId) {
  const id = Number(badgeId);
  return BADGES.find((b) => b.id === id) || null;
}

/** Look up a badge by its string key. */
export function getBadgeByKey(key) {
  return BADGES.find((b) => b.key === key) || null;
}

/**
 * Normalize a profile row (+ optional boss flag) into the shape the
 * milestone predicates expect. `regions_traveled` lives on
 * profiles.story_progress and unlocks regions permanently by travel.
 */
export function playerDataFromProfile(profile, { bossWon = false } = {}) {
  return {
    questsCompleted: profile?.quests_completed || 0,
    longestStreak: profile?.longest_streak || 0,
    level: profile?.level || 1,
    traveled: profile?.story_progress?.regions_traveled || [],
    bossWon: !!bossWon,
  };
}

/** How many world-map regions are unlocked for this player (incl. the starter zone). */
export function unlockedRegionCount(playerData) {
  const wr = {
    totalCheckins: playerData.questsCompleted,
    longestStreak: playerData.longestStreak,
    level: playerData.level,
    traveled: playerData.traveled,
  };
  return WORLD_REGIONS.filter((region) => getUnlockStatus(region, wr)).length;
}

/**
 * Is a given badge earned for this player? Pure, so it can be shared by the
 * client gallery and (re-implemented identically) by the signing Edge Function.
 */
export function isBadgeEarned(badgeId, playerData) {
  const id = Number(badgeId);
  const regions = unlockedRegionCount(playerData);
  switch (id) {
    case 1:
      return playerData.questsCompleted >= 7;
    case 2:
      return regions > 1; // at least one region beyond the always-available starter zone
    case 3:
      return playerData.bossWon === true;
    case 4:
      return playerData.questsCompleted >= 100;
    case 5:
      return regions >= WORLD_REGIONS.length;
    default:
      return false;
  }
}

/** Every earned badge id for a player. */
export function earnedBadgeIds(playerData) {
  return BADGES.filter((b) => isBadgeEarned(b.id, playerData)).map((b) => b.id);
}

/**
 * Progress toward a badge, for the gallery's unearned hints:
 * { current, required, label } or null when not countable.
 */
export function badgeProgress(badgeId, playerData) {
  const id = Number(badgeId);
  const regions = unlockedRegionCount(playerData);
  switch (id) {
    case 1:
      return { current: Math.min(playerData.questsCompleted, 7), required: 7, label: 'quests' };
    case 2:
      return { current: Math.min(Math.max(regions - 1, 0), 1), required: 1, label: 'new region' };
    case 3:
      return { current: playerData.bossWon ? 1 : 0, required: 1, label: 'boss' };
    case 4:
      return { current: Math.min(playerData.questsCompleted, 100), required: 100, label: 'quests' };
    case 5:
      return { current: regions, required: WORLD_REGIONS.length, label: 'regions' };
    default:
      return null;
  }
}
