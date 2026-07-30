/**
 * The Storybook meet math. The invariant a child actually experiences: one
 * new friend at most per quest completion, earned every MEET_EVERY quests,
 * in a fixed order, never lost and never duplicated -- including for a
 * veteran account that predates the feature with dozens of quests banked.
 */
const {
  MEET_EVERY,
  MEETING_ORDER,
  ROSTER_SIZE,
  VALID_MEET_SLUGS,
  normalizeMet,
  dueMeet,
  metCharacterNames,
  storybookEntries,
} = require('@/lib/storybook');
const { CAST } = require('@/lib/cast');

describe('roster integrity', () => {
  test('every meeting-order slug has art in CAST', () => {
    for (const { slug } of MEETING_ORDER) {
      expect(CAST[slug]).toBeDefined();
      expect(CAST[slug].src).toMatch(/^\/images\/cast\//);
    }
  });

  test('no duplicate slugs and no duplicate display names', () => {
    const slugs = MEETING_ORDER.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    // Style variants share a name in CAST; the roster must pick one each.
    const names = MEETING_ORDER.map((m) => CAST[m.slug].name);
    expect(new Set(names).size).toBe(names.length);
  });

  test('every character has a story beat', () => {
    for (const { beat } of MEETING_ORDER) {
      expect(typeof beat).toBe('string');
      expect(beat.length).toBeGreaterThan(10);
    }
  });
});

describe('dueMeet', () => {
  test('nothing due before the first threshold', () => {
    expect(dueMeet(0, [])).toBeNull();
    expect(dueMeet(MEET_EVERY - 1, [])).toBeNull();
  });

  test('first character due exactly at the first threshold', () => {
    const due = dueMeet(MEET_EVERY, []);
    expect(due).not.toBeNull();
    expect(due.slug).toBe(MEETING_ORDER[0].slug);
    expect(due.src).toBe(CAST[MEETING_ORDER[0].slug].src);
  });

  test('nothing due when met count matches earned count', () => {
    expect(dueMeet(MEET_EVERY, [MEETING_ORDER[0].slug])).toBeNull();
  });

  test('veteran backlog surfaces exactly one character at a time', () => {
    // 30 quests banked, nobody met: 10 meets earned, but only ONE returned.
    const due = dueMeet(MEET_EVERY * 10, []);
    expect(due.slug).toBe(MEETING_ORDER[0].slug);
    // After meeting them, the NEXT single character is due, not a batch.
    const due2 = dueMeet(MEET_EVERY * 10, [MEETING_ORDER[0].slug]);
    expect(due2.slug).toBe(MEETING_ORDER[1].slug);
  });

  test('caps at the roster: a million quests never overflows', () => {
    const all = MEETING_ORDER.map((m) => m.slug);
    expect(dueMeet(1_000_000, all)).toBeNull();
  });

  test('garbage in met_characters is ignored, not fatal', () => {
    const due = dueMeet(MEET_EVERY, [42, null, 'not-a-real-slug', {}]);
    expect(due.slug).toBe(MEETING_ORDER[0].slug);
    expect(normalizeMet('nonsense')).toEqual([]);
    expect(normalizeMet(undefined)).toEqual([]);
  });
});

describe('storybook views', () => {
  test('entries mark met and unmet correctly, in order', () => {
    const met = [MEETING_ORDER[2].slug];
    const entries = storybookEntries(met);
    expect(entries).toHaveLength(ROSTER_SIZE);
    expect(entries[2].met).toBe(true);
    expect(entries[0].met).toBe(false);
    expect(entries[0].order).toBe(1);
  });

  test('cameo names are newest-first, deduped, capped', () => {
    const met = MEETING_ORDER.slice(0, 10).map((m) => m.slug);
    const names = metCharacterNames(met, 3);
    expect(names).toHaveLength(3);
    expect(names[0]).toBe(CAST[MEETING_ORDER[9].slug].name);
  });

  test('VALID_MEET_SLUGS matches the roster exactly', () => {
    expect(VALID_MEET_SLUGS.size).toBe(ROSTER_SIZE);
  });
});

describe('encounter cast faces', () => {
  const { ENCOUNTER_TABLE } = require('@/lib/encounterTable');

  test('every castKey points at real CAST art', () => {
    for (const row of ENCOUNTER_TABLE) {
      if (row.castKey) {
        expect(CAST[row.castKey]).toBeDefined();
        expect(CAST[row.castKey].src).toMatch(/^\/images\/cast\//);
      }
    }
  });

  test('castKey is display-only: reward fields intact on every row', () => {
    for (const row of ENCOUNTER_TABLE) {
      expect(typeof row.rewardType).toBe('string');
      expect(Array.isArray(row.rewardRange)).toBe(true);
      expect(row.icon).toBeTruthy();
    }
  });

  test('Companion Gift keeps its emoji (no cast face by design)', () => {
    const gift = ENCOUNTER_TABLE.find((e) => e.name === 'Companion Gift');
    expect(gift.castKey).toBeUndefined();
  });
});
