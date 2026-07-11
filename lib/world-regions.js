export const WORLD_REGIONS = [
  {
    id: 'aeloria_plains',
    name: 'Aeloria Plains',
    subtitle: 'The Starter Lands',
    lore: 'Rolling golden fields where every hero begins their journey. The air smells of adventure and the roads are well-worn by those who came before.',
    habitTheme: 'All habits',
    unlockCondition: 'Starting zone, always available',
    unlockKey: 'always',
    // Approximate % position on the map image (x, y from top-left, w, h as % of image)
    // Calibrate after visual testing: add console.log to click handler and click each region
    hotspot: { x: 42, y: 45, w: 18, h: 16 },
    color: '#c8a96e',
    icon: '🌾',
  },
  {
    id: 'thornback_forest',
    name: 'Thornback Forest',
    subtitle: 'The Dark Wood',
    lore: 'Ancient trees that remember when the world was young. Only those who have proven their physical discipline may pass through the thorned gates.',
    habitTheme: 'Physical / movement',
    // First unlockable region: opens with the very first completed quest so
    // the map moves on day one (no level or long-run gate before the map
    // gives the player something).
    unlockCondition: 'Complete your first quest',
    unlockKey: 'checkins_1',
    hotspot: { x: 20, y: 30, w: 16, h: 20 },
    color: '#2d5a27',
    icon: '🌲',
  },
  {
    id: 'ember_coast',
    name: 'Ember Coast',
    subtitle: 'The Burning Shore',
    lore: 'Volcanic shores where smiths and scholars alike are forged. The sea glows amber at dusk. Reach it only after proving consistent effort.',
    habitTheme: 'Creative / learning',
    unlockCondition: 'Complete 10 quests',
    unlockKey: 'checkins_10',
    hotspot: { x: 68, y: 55, w: 18, h: 14 },
    color: '#c45c1a',
    icon: '🔥',
  },
  {
    id: 'ashfall_peaks',
    name: 'Ashfall Peaks',
    subtitle: 'The High Reaches',
    lore: 'Snow-capped summits where the wind carries whispers of the old gods. Those who climb here have mastered stillness of mind.',
    habitTheme: 'Mindfulness / meditation',
    unlockCondition: '14 active days in your best run',
    unlockKey: 'streak_14',
    hotspot: { x: 30, y: 10, w: 20, h: 18 },
    color: '#8ba0b4',
    icon: '⛰️',
  },
  {
    id: 'dusk_marshes',
    name: 'Dusk Marshes',
    subtitle: 'The Twilight Fens',
    lore: 'Mist-wrapped wetlands at the edge of the known world. Herons wade through silver water. Rest is power here. Few understand that.',
    habitTheme: 'Sleep / recovery',
    unlockCondition: 'Complete 21 quests',
    unlockKey: 'checkins_21',
    hotspot: { x: 55, y: 72, w: 20, h: 14 },
    color: '#4a6741',
    icon: '🌿',
  },
  {
    id: 'sunken_city',
    name: 'The Sunken City',
    subtitle: 'Lost Beneath the Waves',
    lore: 'A drowned empire that refused to die. Its spires still pierce the surface at low tide. Only heroes of significant renown may dive its depths.',
    habitTheme: 'Challenge habits',
    unlockCondition: 'Reach Level 20',
    unlockKey: 'level_20',
    hotspot: { x: 72, y: 78, w: 14, h: 12 },
    color: '#2a4a6b',
    icon: '🏛️',
  },
  {
    id: 'deepstone_mines',
    name: 'Deepstone Mines',
    subtitle: 'The Deep Places',
    lore: 'Where the mountain opens into eternity. The deepest veins of the world run here. Mastery lives in these tunnels, and so does madness.',
    habitTheme: 'Mastery zone',
    unlockCondition: 'Reach Level 30',
    unlockKey: 'level_30',
    hotspot: { x: 18, y: 62, w: 14, h: 14 },
    color: '#3a2a1a',
    icon: '⛏️',
  },
];

export function getUnlockStatus(region, playerData) {
  const { unlockKey } = region;
  if (unlockKey === 'always') return true;
  if (!playerData) return false;

  const { totalCheckins = 0, longestStreak = 0, level = 1 } = playerData;

  switch (unlockKey) {
    case 'checkins_1':   return totalCheckins >= 1;
    case 'streak_7':     return longestStreak >= 7; // legacy key, kept for safety
    case 'checkins_10':  return totalCheckins >= 10;
    case 'streak_14':    return longestStreak >= 14;
    case 'checkins_21':  return totalCheckins >= 21;
    case 'level_20':     return level >= 20;
    case 'level_30':     return level >= 30;
    default:             return false;
  }
}

/**
 * Returns progress toward unlock as { current, required, label }
 */
export function getUnlockProgress(region, playerData) {
  if (!playerData) return null;
  const { unlockKey } = region;
  const { totalCheckins = 0, longestStreak = 0, level = 1 } = playerData;

  switch (unlockKey) {
    case 'checkins_1':  return { current: Math.min(totalCheckins, 1),   required: 1,  label: 'quests' };
    case 'streak_7':    return { current: Math.min(longestStreak, 7),   required: 7,  label: 'active days' };
    case 'checkins_10': return { current: Math.min(totalCheckins, 10),  required: 10, label: 'quests' };
    case 'streak_14':   return { current: Math.min(longestStreak, 14),  required: 14, label: 'active days' };
    case 'checkins_21': return { current: Math.min(totalCheckins, 21),  required: 21, label: 'quests' };
    case 'level_20':    return { current: Math.min(level, 20),          required: 20, label: 'level' };
    case 'level_30':    return { current: Math.min(level, 30),          required: 30, label: 'level' };
    default:            return null;
  }
}
