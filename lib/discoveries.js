/**
 * Map Discoveries: hidden landmarks inside each world region that reveal
 * themselves as you keep questing. A pure collection layer, derived
 * entirely from profile stats (no DB writes, no decay, no deadlines).
 * Once your numbers pass a threshold the discovery is yours forever.
 *
 * Requirements use the same playerData shape as world-regions:
 * { totalCheckins, longestStreak, level }.
 */

export const DISCOVERIES = [
  // ── Aeloria Plains (starter, always unlocked) ──────────────────────
  {
    id: 'waymarker_stone',
    regionId: 'aeloria_plains',
    name: 'The Waymarker Stone',
    icon: '🪨',
    lore: 'Every hero who ever started carved one line here. Yours is fresh.',
    requires: { type: 'checkins', value: 2 },
  },
  {
    id: 'old_windmill',
    regionId: 'aeloria_plains',
    name: 'The Old Windmill',
    icon: '🌬️',
    lore: 'It turns slowly but it never stops. The millers say that is the whole trick.',
    requires: { type: 'checkins', value: 5 },
  },
  {
    id: 'lantern_crossroads',
    regionId: 'aeloria_plains',
    name: 'Lantern Crossroads',
    icon: '🏮',
    lore: 'Four roads, one lantern, always lit. Travelers leave notes for whoever comes next.',
    requires: { type: 'checkins', value: 8 },
  },

  // ── Thornback Forest (unlocks at 1 quest) ──────────────────────────
  {
    id: 'mossback_shrine',
    regionId: 'thornback_forest',
    name: 'Mossback Shrine',
    icon: '🍄',
    lore: 'A shrine swallowed by moss. Something under the green still hums when you pass.',
    requires: { type: 'checkins', value: 4 },
  },
  {
    id: 'deer_king_glade',
    regionId: 'thornback_forest',
    name: 'The Deer King’s Glade',
    icon: '🦌',
    lore: 'He watched you walk the whole path before showing himself. You earned the glade.',
    requires: { type: 'checkins', value: 7 },
  },
  {
    id: 'thornback_falls',
    regionId: 'thornback_forest',
    name: 'Thornback Falls',
    icon: '💧',
    lore: 'Water that carved stone by showing up every day. It did not hurry once.',
    requires: { type: 'checkins', value: 12 },
  },

  // ── Ember Coast (unlocks at 10 quests) ─────────────────────────────
  {
    id: 'glassmakers_forge',
    regionId: 'ember_coast',
    name: 'The Glassmaker’s Forge',
    icon: '🫧',
    lore: 'Sand becomes glass here, one careful heat at a time. The maker never rushes the melt.',
    requires: { type: 'checkins', value: 13 },
  },
  {
    id: 'tidefire_pools',
    regionId: 'ember_coast',
    name: 'Tidefire Pools',
    icon: '🌊',
    lore: 'Pools that glow amber at dusk. Scholars soak here and pretend it is research.',
    requires: { type: 'checkins', value: 16 },
  },
  {
    id: 'salt_library',
    regionId: 'ember_coast',
    name: 'The Salt Library',
    icon: '📚',
    lore: 'Books bound in kelp, indexed by tide. Late fees are forgiven. All of them. Always.',
    requires: { type: 'checkins', value: 19 },
  },

  // ── Ashfall Peaks (unlocks at 14 active days) ──────────────────────
  {
    id: 'windchime_pass',
    regionId: 'ashfall_peaks',
    name: 'Windchime Pass',
    icon: '🎐',
    lore: 'A thousand chimes strung by climbers. The mountain plays them when you breathe slower.',
    requires: { type: 'activeDays', value: 15 },
  },
  {
    id: 'hermits_kettle',
    regionId: 'ashfall_peaks',
    name: 'The Hermit’s Kettle',
    icon: '🍵',
    lore: 'Still warm. It is always still warm. Nobody has ever seen the hermit leave or arrive.',
    requires: { type: 'activeDays', value: 17 },
  },
  {
    id: 'skyfacing_stones',
    regionId: 'ashfall_peaks',
    name: 'The Skyfacing Stones',
    icon: '🗿',
    lore: 'Stones arranged to watch the stars. Sit with them long enough and the noise stops.',
    requires: { type: 'checkins', value: 26 },
  },

  // ── Dusk Marshes (unlocks at 21 quests) ────────────────────────────
  {
    id: 'heron_court',
    regionId: 'dusk_marshes',
    name: 'The Heron Court',
    icon: '🪶',
    lore: 'The herons hold council at dusk. Tonight they let you listen.',
    requires: { type: 'checkins', value: 24 },
  },
  {
    id: 'sleepwater_spring',
    regionId: 'dusk_marshes',
    name: 'Sleepwater Spring',
    icon: '🌙',
    lore: 'Drink and you will sleep like the marsh: deep, unhurried, unapologetic.',
    requires: { type: 'checkins', value: 28 },
  },
  {
    id: 'firefly_cathedral',
    regionId: 'dusk_marshes',
    name: 'The Firefly Cathedral',
    icon: '✨',
    lore: 'A dead tree filled with ten thousand fireflies. It only lights up for the patient.',
    requires: { type: 'checkins', value: 33 },
  },

  // ── The Sunken City (unlocks at level 20) ──────────────────────────
  {
    id: 'drowned_bell',
    regionId: 'sunken_city',
    name: 'The Drowned Bell',
    icon: '🔔',
    lore: 'It rings once a year, they said. It rang when you arrived. Make of that what you will.',
    requires: { type: 'level', value: 21 },
  },
  {
    id: 'pearl_archive',
    regionId: 'sunken_city',
    name: 'The Pearl Archive',
    icon: '🦪',
    lore: 'Every pearl holds a memory of the old empire. One of them now holds yours.',
    requires: { type: 'level', value: 23 },
  },
  {
    id: 'tide_throne',
    regionId: 'sunken_city',
    name: 'The Tide Throne',
    icon: '🪸',
    lore: 'The empty throne of the drowned king. It does not want a ruler. It wants a witness.',
    requires: { type: 'checkins', value: 45 },
  },

  // ── Deepstone Mines (unlocks at level 30) ──────────────────────────
  {
    id: 'singing_vein',
    regionId: 'deepstone_mines',
    name: 'The Singing Vein',
    icon: '💎',
    lore: 'A seam of crystal that hums your own quest log back to you, note by note.',
    requires: { type: 'level', value: 31 },
  },
  {
    id: 'forge_of_names',
    regionId: 'deepstone_mines',
    name: 'The Forge of Names',
    icon: '⚒️',
    lore: 'Where legends are stamped into metal. There is a blank plate here with your measurements.',
    requires: { type: 'level', value: 33 },
  },
  {
    id: 'bottom_of_the_world',
    regionId: 'deepstone_mines',
    name: 'The Bottom of the World',
    icon: '🕳️',
    lore: 'You looked in. It looked back, nodded once, and let you keep the lantern.',
    requires: { type: 'checkins', value: 75 },
  },
];

/** Has this discovery been revealed for the given playerData? */
export function isDiscovered(discovery, playerData) {
  if (!playerData) return false;
  const { totalCheckins = 0, longestStreak = 0, level = 1 } = playerData;
  const { type, value } = discovery.requires;
  if (type === 'checkins') return totalCheckins >= value;
  if (type === 'activeDays') return longestStreak >= value;
  if (type === 'level') return level >= value;
  return false;
}

/** All discoveries for one region. */
export function getDiscoveriesForRegion(regionId) {
  return DISCOVERIES.filter((d) => d.regionId === regionId);
}

/** Overall collection progress: { found, total }. */
export function getDiscoveryCounts(playerData) {
  const found = DISCOVERIES.filter((d) => isDiscovered(d, playerData)).length;
  return { found, total: DISCOVERIES.length };
}

/** Forward-looking hint for an undiscovered landmark. Never guilt. */
export function discoveryHint(discovery, playerData) {
  const { totalCheckins = 0, longestStreak = 0, level = 1 } = playerData || {};
  const { type, value } = discovery.requires;
  if (type === 'checkins') {
    const remaining = Math.max(1, value - totalCheckins);
    return `${remaining} ${remaining === 1 ? 'quest' : 'quests'} until this reveals itself`;
  }
  if (type === 'activeDays') {
    const remaining = Math.max(1, value - longestStreak);
    return `${remaining} more active ${remaining === 1 ? 'day' : 'days'} in your best run reveals this`;
  }
  if (type === 'level') {
    return `Reach level ${value} and this reveals itself`;
  }
  return 'Keep questing. It is watching for you.';
}
