/**
 * The companion hatch: threshold, trigger gate, and the lost-increment miss.
 *
 * Production forensics behind these tests (July 2026): a user with 5 completed
 * quests had companion_name_prompted = false while two users with 4 did not.
 * The 5-quest user turned out to be a ship-date artifact, not a code bug —
 * they played one five-minute session on July 17 and the naming flow shipped
 * July 25 — and the catch-up gate below is what prompts them on their next
 * dashboard load. But the investigation surfaced a real hole on the way: the
 * quests_completed counter (the only thing the hatch reads) was written as
 * snapshot+1 from a profile read at the top of the request, which loses an
 * increment when two completions land together. These tests pin down the
 * threshold, reproduce that miss against the old formula, and prove the
 * count-derived formula heals it.
 */
const {
  STAGE_THRESHOLDS,
  companionStage,
  shouldPromptCompanionNaming,
  nextQuestsCompleted,
} = require('../../lib/companions');

describe('hatch threshold', () => {
  test('the egg hatches at exactly 3 completed quests', () => {
    expect(STAGE_THRESHOLDS[1]).toBe(3);
    expect(companionStage(2)).toBe(0); // still an egg
    expect(companionStage(3)).toBe(1); // hatched
    expect(companionStage(5)).toBe(1); // past-threshold accounts hatch too
  });
});

describe('shouldPromptCompanionNaming (the trigger gate)', () => {
  const base = { companion_name: null, companion_name_prompted: false };

  test('fires the instant the third quest lands', () => {
    expect(shouldPromptCompanionNaming({ ...base, quests_completed: 2 })).toBe(false);
    expect(shouldPromptCompanionNaming({ ...base, quests_completed: 3 })).toBe(true);
  });

  test('catch-up: a user already past 3 quests is prompted on next load', () => {
    // The production 5-quest user: crossed the threshold before the naming
    // flow shipped, never answered a prompt. Their next dashboard load must
    // open the hatch — the egg does not just sit there.
    expect(
      shouldPromptCompanionNaming({ ...base, quests_completed: 5 })
    ).toBe(true);
  });

  test('never re-prompts once answered — named or skipped', () => {
    expect(
      shouldPromptCompanionNaming({
        quests_completed: 4,
        companion_name: 'Cleo',
        companion_name_prompted: true,
      })
    ).toBe(false);
    // Skipped ("I'll decide later"): prompted true, no name.
    expect(
      shouldPromptCompanionNaming({
        ...base,
        quests_completed: 4,
        companion_name_prompted: true,
      })
    ).toBe(false);
    // Renamed from the card without the flag (belt and braces).
    expect(
      shouldPromptCompanionNaming({ ...base, quests_completed: 4, companion_name: 'Sparkle' })
    ).toBe(false);
  });

  test('quiet on missing or pre-threshold profiles', () => {
    expect(shouldPromptCompanionNaming(null)).toBe(false);
    expect(shouldPromptCompanionNaming({ ...base, quests_completed: 0 })).toBe(false);
    expect(shouldPromptCompanionNaming({ ...base })).toBe(false);
  });
});

describe('the lost-increment miss', () => {
  // Two completions land together: both requests snapshot the profile at
  // counter = 1, then each writes. Three quest rows are completed, but the
  // counter the hatch reads says 2 — the egg never hatches on the quest that
  // earned it.
  test('reproduces: snapshot+1 under concurrent completions strands the egg', () => {
    const snapshot = 1; // both requests read this before either wrote
    const oldFormula = (profileCounter) => (profileCounter || 0) + 1;

    const writeA = oldFormula(snapshot); // 2
    const writeB = oldFormula(snapshot); // 2 — the lost increment
    const counterAfter = Math.max(writeA, writeB);

    const completedRows = 3; // what the quests table actually says
    expect(counterAfter).toBe(2);
    expect(counterAfter).toBeLessThan(completedRows);
    // The miss itself: three real quests, and the hatch gate stays shut.
    expect(
      shouldPromptCompanionNaming({
        companion_name: null,
        companion_name_prompted: false,
        quests_completed: counterAfter,
      })
    ).toBe(false);
  });

  test('fixed: deriving from the completed-row count hatches on quest 3', () => {
    const snapshot = 1;
    // Same interleaving, but each request now counts committed completed rows.
    // Request A's count may or may not see B's row; the later write sees both.
    const writeA = nextQuestsCompleted(snapshot, 2); // 2
    const writeB = nextQuestsCompleted(snapshot, 3); // 3 — heals the drift
    const counterAfter = Math.max(writeA, writeB);

    expect(counterAfter).toBe(3);
    expect(
      shouldPromptCompanionNaming({
        companion_name: null,
        companion_name_prompted: false,
        quests_completed: counterAfter,
      })
    ).toBe(true);
  });

  test('row-count read failure falls back to snapshot+1, never below it', () => {
    expect(nextQuestsCompleted(4, null)).toBe(5);
    expect(nextQuestsCompleted(4, undefined)).toBe(5);
    expect(nextQuestsCompleted(null, null)).toBe(1);
  });

  test('a stale or lagging count can never move the counter backwards', () => {
    // Replica lag or a pruned view must not shrink lifetime progress.
    expect(nextQuestsCompleted(10, 4)).toBe(11);
  });
});
