/**
 * The free-tier cap. This had a real defect: auto-generated recurring instances
 * were counted, so a user with three habits accumulated instances every day and
 * eventually could not create a quest because of quests they never asked for.
 * No test covered it, because no test in this repo could import lib/.
 */
const { countHabitsTowardLimit, FREE_TIER_QUEST_LIMIT } = require('@/lib/quest-limits');

const quest = (over = {}) => ({
  id: 'q',
  completed: false,
  recurring_quest_id: null,
  status: 'active',
  ...over,
});

describe('countHabitsTowardLimit', () => {
  test('counts open user-created quests', () => {
    expect(countHabitsTowardLimit([quest(), quest(), quest()])).toBe(3);
  });

  test('completed quests do not count', () => {
    expect(countHabitsTowardLimit([quest({ completed: true }), quest()])).toBe(1);
  });

  test('auto-generated recurring instances do not count -- the accumulation bug', () => {
    // Three real habits, each having generated a daily instance. The old count
    // said 6 and locked the user out; the correct answer is 3.
    const habits = [quest({ id: 'a' }), quest({ id: 'b' }), quest({ id: 'c' })];
    const instances = [
      quest({ id: 'a1', recurring_quest_id: 'a' }),
      quest({ id: 'b1', recurring_quest_id: 'b' }),
      quest({ id: 'c1', recurring_quest_id: 'c' }),
    ];
    expect(countHabitsTowardLimit([...habits, ...instances])).toBe(3);
  });

  test('a day of accumulation cannot push a 3-habit user over the cap', () => {
    // 30 days of instances behind 3 habits. If this ever returns >= the limit,
    // a child with three habits is locked out of making a fourth.
    const habits = [quest({ id: 'a' }), quest({ id: 'b' }), quest({ id: 'c' })];
    const instances = Array.from({ length: 90 }, (_, i) =>
      quest({ id: `i${i}`, recurring_quest_id: 'a' })
    );
    expect(countHabitsTowardLimit([...habits, ...instances])).toBeLessThan(
      FREE_TIER_QUEST_LIMIT
    );
  });

  test('superseded (archived) instances do not count', () => {
    expect(countHabitsTowardLimit([quest({ status: 'superseded' }), quest()])).toBe(1);
  });

  test('empty, null and undefined are 0 rather than a crash', () => {
    expect(countHabitsTowardLimit([])).toBe(0);
    expect(countHabitsTowardLimit(null)).toBe(0);
    expect(countHabitsTowardLimit(undefined)).toBe(0);
  });

  test('the limit is a positive integer', () => {
    expect(Number.isInteger(FREE_TIER_QUEST_LIMIT)).toBe(true);
    expect(FREE_TIER_QUEST_LIMIT).toBeGreaterThan(0);
  });
});
