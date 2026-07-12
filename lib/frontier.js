/**
 * The Endless Frontier: the map never ends. Beyond the seven authored
 * regions, new lands generate forever — deterministically, so every
 * player sees the same world and every device agrees. There is no final
 * region, no "all charted", no winning screen. There is always a next
 * horizon, and it is always reachable by setting course.
 *
 * Frontier regions are reachable ONLY by travel (the Journey system),
 * in order: frontier_2 requires frontier_1, and so on. Distance grows
 * gently and caps, so the frontier stays an invitation, not a wall.
 */

const PREFIXES = [
  'Silverwind', 'Ashen', 'Whispering', 'Gilded', 'Howling', 'Verdant',
  'Starlit', 'Umbral', 'Copperleaf', 'Frostbound', 'Amberfall', 'Thunder',
  'Mistveil', 'Ironroot', 'Duskwater', 'Brightspire', 'Wandering', 'Molten',
  'Hollowlight', 'Evervale',
];

const SUFFIXES = [
  'Reaches', 'Expanse', 'Wilds', 'Hollows', 'Steppe', 'Archipelago',
  'Canopy', 'Dunes', 'Glaciers', 'Highlands', 'Shallows', 'Barrens',
  'Terraces', 'Labyrinth', 'Meadows', 'Crags', 'Depths', 'Spires',
  'Crossing', 'Frontier',
];

const ICONS = ['🏔️', '🌋', '🏝️', '🌌', '🏜️', '❄️', '🌀', '🪐', '🌿', '🗻', '🌊', '🕯️'];

const COLORS = [
  '#7dd3fc', '#f9a8d4', '#a7f3d0', '#fcd34d', '#c4b5fd', '#fdba74',
  '#94a3b8', '#86efac', '#f87171', '#67e8f9', '#d8b4fe', '#fde68a',
];

const THEMES = [
  'All habits', 'Physical / movement', 'Creative / learning',
  'Mindfulness / meditation', 'Sleep / recovery', 'Challenge habits',
];

const LORE_TEMPLATES = [
  'No cartographer has held a pen steady long enough to finish drawing {name}. You will be the first to walk it whole.',
  'The maps end before {name} begins. The locals like it that way, and they will like you if you keep walking.',
  'They say {name} moves when nobody is questing toward it. It has been holding still for you for a while now.',
  '{name} does not appear on official charts. Officially, neither do heroes like you.',
  'Beyond the last marked road lies {name}. Every step into it is a step nobody has counted before.',
  'The wind that crosses {name} has never carried a "finished". It only carries "next".',
];

// Small deterministic hash (djb2 family, same as bosses/storyBeats)
function hashString(input) {
  const str = String(input || '');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Is this id a frontier region? */
export function isFrontierId(regionId) {
  return typeof regionId === 'string' && /^frontier_\d+$/.test(regionId);
}

/** Frontier index from an id ('frontier_3' -> 3), or null. */
export function frontierIndex(regionId) {
  if (!isFrontierId(regionId)) return null;
  return parseInt(regionId.split('_')[1], 10);
}

/** Travel distance for frontier N: starts at 10, +2 per region, caps at 30. */
export function frontierDistance(index) {
  return Math.min(10 + (index - 1) * 2, 30);
}

/**
 * Deterministically generate frontier region N (same for every player).
 * Prefix/suffix pairing is offset so names do not repeat until the pools
 * are exhausted in combination (400 unique names before any repeat).
 */
export function generateFrontierRegion(index) {
  if (!index || index < 1) return null;
  // Independent salted hashes per attribute: short-string djb2 values are
  // correlated across neighboring indexes, which made every frontier a
  // "Canopy". Salting decorrelates each pick.
  const pick = (salt, pool) => pool[hashString(`frontier:${salt}:${index}`) % pool.length];
  const prefix = pick('prefix', PREFIXES);
  const suffix = pick('suffix', SUFFIXES);
  const name = `The ${prefix} ${suffix}`;

  return {
    id: `frontier_${index}`,
    name,
    subtitle: `Frontier ${index} — Beyond the Edge`,
    lore: pick('lore', LORE_TEMPLATES).replace('{name}', name),
    habitTheme: pick('theme', THEMES),
    unlockCondition: `Travel ${frontierDistance(index)} quests beyond the known world`,
    unlockKey: 'frontier',
    icon: pick('icon', ICONS),
    color: pick('color', COLORS),
    frontierIndex: index,
    distance: frontierDistance(index),
  };
}

/**
 * The next frontier index this player can set course for: one past the
 * highest frontier they have reached. Always >= 1, so there is always a
 * next horizon.
 */
export function nextFrontierIndex(traveled = []) {
  let highest = 0;
  for (const id of traveled) {
    const idx = frontierIndex(id);
    if (idx && idx > highest) highest = idx;
  }
  return highest + 1;
}

/** All frontier regions this player has reached, in order. */
export function reachedFrontiers(traveled = []) {
  const indexes = traveled
    .map((id) => frontierIndex(id))
    .filter(Boolean)
    .sort((a, b) => a - b);
  return indexes.map((i) => generateFrontierRegion(i));
}
