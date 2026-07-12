/**
 * Journeys: choose your heading on the world map. Setting a course toward
 * a locked region turns every completed quest into travel. Arrive and the
 * region unlocks permanently. The old stat thresholds still work as an
 * alternate path, so travel only ever makes things unlock SOONER.
 *
 * State lives in profiles.story_progress (no migration):
 *   journey:          { destination, start_count, set_at }
 *   regions_traveled: ['region_id', ...]
 */

// Travel distance in completed quests, scaled by region tier. Direction is
// the player's choice; distance is not. That keeps late regions earned.
export const REGION_DISTANCES = {
  thornback_forest: 3,
  ember_coast: 5,
  ashfall_peaks: 6,
  dusk_marshes: 7,
  sunken_city: 9,
  deepstone_mines: 12,
};

/** Distance in quests for a region id (null = not travelable). */
export function journeyDistance(regionId) {
  return REGION_DISTANCES[regionId] || null;
}

/**
 * Current journey state for a profile.
 * Returns null if no course is set, else:
 * { destination, distance, progress, remaining, complete }
 */
export function getJourneyState(profile) {
  const journey = profile?.story_progress?.journey;
  if (!journey?.destination) return null;

  const distance = journeyDistance(journey.destination);
  if (!distance) return null;

  const questsCompleted = profile?.quests_completed || 0;
  const progress = Math.max(0, questsCompleted - (journey.start_count || 0));

  return {
    destination: journey.destination,
    distance,
    progress: Math.min(progress, distance),
    remaining: Math.max(0, distance - progress),
    complete: progress >= distance,
  };
}

/**
 * All regions unlocked by travel: the persisted list plus the current
 * journey if it has already arrived (covers the gap before the next
 * course-set persists it).
 */
export function traveledRegions(profile) {
  const persisted = profile?.story_progress?.regions_traveled || [];
  const state = getJourneyState(profile);
  if (state?.complete && !persisted.includes(state.destination)) {
    return [...persisted, state.destination];
  }
  return persisted;
}
