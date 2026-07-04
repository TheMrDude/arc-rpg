import { getIsoWeekKey } from './date-utils';

export const MOMENTUM_GOAL_DAYS = 4;

/**
 * Distinct calendar days with at least one completed quest in the
 * trailing 7 days, plus a virtual day if a Momentum Boost was consumed
 * this ISO week. Capped at 7. Never punishes a missed day, only counts up.
 */
export function computeActiveDays(quests, momentumBoostWeek) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const days = new Set();

  for (const quest of quests) {
    if (!quest.completed || !quest.completed_at) continue;
    const completedAt = new Date(quest.completed_at).getTime();
    if (completedAt >= cutoff) {
      days.add(new Date(quest.completed_at).toISOString().slice(0, 10));
    }
  }

  let activeDays = days.size;
  if (momentumBoostWeek && momentumBoostWeek === getIsoWeekKey()) {
    activeDays += 1;
  }

  return Math.min(activeDays, 7);
}
