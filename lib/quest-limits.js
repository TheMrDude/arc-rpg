/**
 * The one place the free-tier quest limit is defined.
 *
 * Counted against *incomplete, user-created* quests. Two exclusions matter:
 *
 *  - Auto-generated recurring instances never count. A recurring habit
 *    generates a fresh instance every day on its own, so counting them would
 *    let the app lock a user out of creating habits because of quests they
 *    never asked for and cannot decline.
 *  - Superseded (archived) instances never count, because they are not real
 *    quests any more.
 *
 * Deliberately NOT connected to the `can_create_quest` Postgres function,
 * which models a 10-quests-per-calendar-month allowance. That is a different
 * rule from "10 open at once", its counter column was never written to by any
 * code, and its companion increment function does not exist. It stays revoked
 * and dead.
 */
export const FREE_TIER_QUEST_LIMIT = 10;

/**
 * How many of a user's quests count against FREE_TIER_QUEST_LIMIT.
 * Kept next to the limit so the count and the threshold can never drift apart.
 */
export function countHabitsTowardLimit(quests) {
  return (quests || []).filter(
    (q) => !q.completed && !q.recurring_quest_id && q.status !== 'superseded'
  ).length;
}
