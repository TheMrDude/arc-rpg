/**
 * The last thing between raw model output and a child's screen.
 *
 * This was listed as a gap: salvageQuestText was an unexported function inside
 * app/api/transform-quest, so the malformed-response path -- the one that also
 * downgrades XP to the lowest tier -- had no test at all. It is now in
 * lib/questTextSafety.js and shared with the unauthenticated landing-page demo,
 * which previously had no output checking whatsoever.
 */
const {
  salvageQuestText,
  parseQuestLine,
  FORMAT_MARKERS,
  MAX_FALLBACK_WORDS,
} = require('@/lib/questTextSafety');

describe('salvageQuestText', () => {
  test('rescues the first sentences of ordinary prose', () => {
    expect(salvageQuestText('Sweep the leaves from the path before dusk falls.')).toBe(
      'Sweep the leaves from the path before dusk falls.'
    );
  });

  test('stops at a JSON blob or a code fence', () => {
    const out = salvageQuestText('Tidy the workshop before the storm. {"difficulty":"easy"}');
    expect(out).toBe('Tidy the workshop before the storm.');
    expect(out).not.toContain('{');
    expect(salvageQuestText('Read one more chapter tonight. ```json\n{}\n```')).toBe(
      'Read one more chapter tonight.'
    );
  });

  test('REJECTS a response that leaked the prompt back', () => {
    // The failure this exists for: the model echoes its instructions and the
    // route renders them. Every marker must be caught, not just a sample.
    for (const marker of FORMAT_MARKERS) {
      expect(salvageQuestText(`${marker} something that looks like prose here.`)).toBeNull();
    }
  });

  test('REJECTS anything over the word bound', () => {
    const long = `${'word '.repeat(MAX_FALLBACK_WORDS + 5)}.`;
    expect(salvageQuestText(long)).toBeNull();
  });

  test('REJECTS a fragment too short to be a quest', () => {
    expect(salvageQuestText('Go.')).toBeNull();
    expect(salvageQuestText('ok')).toBeNull();
  });

  test('REJECTS empty, null, undefined and non-strings rather than throwing', () => {
    // A route that 500s here would take quest creation down, which is exactly
    // the outage this codebase already had once.
    for (const bad of ['', '   ', null, undefined, 42, {}, []]) {
      expect(salvageQuestText(bad)).toBeNull();
    }
  });
});

describe('parseQuestLine', () => {
  test('takes the QUEST: line when the format was followed', () => {
    expect(parseQuestLine('QUEST: Climb the hill behind the house before the sun goes down.')).toBe(
      'Climb the hill behind the house before the sun goes down.'
    );
  });

  test('is case- and whitespace-tolerant about the marker', () => {
    expect(parseQuestLine('  quest:   Water every plant on the sill before breakfast.  ')).toBe(
      'Water every plant on the sill before breakfast.'
    );
  });

  test('ignores preamble and finds the line', () => {
    expect(
      parseQuestLine("Sure! Here you go:\nQUEST: Fold the laundry mountain into neat towers.")
    ).toBe('Fold the laundry mountain into neat towers.');
  });

  test('REJECTS a format-compliant line that still leaked instructions', () => {
    // Following the format is not the same as producing a quest. A response of
    // "QUEST: OUTPUT FORMAT -- reply with..." parses cleanly and must still fail.
    expect(parseQuestLine('QUEST: OUTPUT FORMAT -- reply with exactly these four lines')).toBeNull();
    expect(parseQuestLine('QUEST: NEVER WRITE anything about the shadow')).toBeNull();
  });

  test('REJECTS a QUEST: line that is too long or too short', () => {
    expect(parseQuestLine(`QUEST: ${'word '.repeat(MAX_FALLBACK_WORDS + 3)}`)).toBeNull();
    expect(parseQuestLine('QUEST: Go now')).toBeNull();
  });

  test('falls back to salvage when the marker is absent', () => {
    expect(parseQuestLine('Sweep the leaves from the path before dusk falls.')).toBe(
      'Sweep the leaves from the path before dusk falls.'
    );
  });

  test('returns null for junk, so a caller can never render raw output', () => {
    // The contract the routes depend on: a checked string, or null. There is no
    // third outcome, so there is no branch where unvalidated text reaches a page.
    for (const bad of ['', null, undefined, '```json\n{"x":1}\n```', 'QUEST:', 7]) {
      expect(parseQuestLine(bad)).toBeNull();
    }
  });
});
