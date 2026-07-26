/**
 * Story beats: one short flavorful line acknowledging a quest completion.
 * No AI call (latency/cost): lines are picked deterministically from a
 * pool seeded by the quest id, so the same completion always gets the
 * same line but consecutive quests feel varied.
 *
 * Tone rules: second person, punchy RPG flavor, warm, never guilt,
 * no streak language, no em dashes.
 */

export const STORY_BEATS = {
  // Same problem as shadow, milder: "The blade falls" and "The arena is quiet
  // now. You made it that way" both read as violence once you look at them. The
  // two lines about effort rather than combat are kept unchanged.
  warrior: [
    'One more win. The kind you did on purpose.',
    'Somewhere, a drum answers your work.',
    'You did the hard thing first. Warriors call that strategy.',
    'Your training log gains a line. Your legend gains a page.',
    'The field is quiet now. You made it that way.',
    'Courage sharpens courage. Today, you were both.',
  ],
  builder: [
    'One more stone set. The tower does not know it yet, but it is taller.',
    'The blueprint smiles. Another beam sits true.',
    'You built something today that tomorrow will stand on.',
    'The workshop lights dim, but the work remains. That is the point.',
    'Brick by brick. Somewhere, a map-maker adds a new line.',
    'Good foundations never make headlines. They make everything else.',
  ],
  sage: [
    'The deed is done. Somewhere, a librarian shelves a new page about you.',
    'A small truth learned is a large door opened.',
    'The candle burns lower. Your understanding burns brighter.',
    'You asked, you acted, and you know more than you did at dawn.',
    'The archive grows. The archivist nods.',
    'Wisdom is just practice that kept its receipts.',
  ],
  // Rewritten. Four of the six previous lines used contract-killing vocabulary --
  // "the mark", "another contract complete", "leaves no mess" -- and this pool
  // ships to every shadow player on EVERY completion, so it is the most-read
  // narration in the app. Same voice, none of the furniture.
  shadow: [
    'Done quietly. Done well. Nobody had to be told.',
    'No fanfare. Just a thing finished and a door closed softly behind you.',
    'Crossed off before anyone noticed it was on the list. Perfect.',
    'You moved through the day like a good rumour. The rumour is winning.',
    'Another quiet win. Your notebook is getting impressive.',
    'The best work leaves no fuss behind it, only results.',
  ],
  seeker: [
    'One step further than yesterday. The horizon takes notes.',
    'The deed is done. Somewhere, a map-maker adds a new line.',
    'New ground under your boots. Old doubts left at the trailhead.',
    'The compass twitches. It likes where this is going.',
    'You went. You did. The road remembers travelers like you.',
    'Every finished quest is a postcard from a braver you.',
  ],
  default: [
    'The deed is done. The campaign continues.',
    'A small quest, a real victory. The story moves.',
    'The innkeeper marks your tab: paid in deeds.',
    'Your chronicle gains a line worth keeping.',
    'Somewhere, a bard hums a bar of your song.',
    'Quest complete. The world is one notch better for it.',
  ],
};

// Small deterministic string hash (djb2-ish, unsigned).
function hashString(input) {
  const str = String(input || '');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Pick a story beat for an archetype, seeded by a stable value
 * (typically the quest id) so the choice is pseudo-random but stable.
 */
export function getStoryBeat(archetype, seed) {
  const pool = STORY_BEATS[archetype] || STORY_BEATS.default;
  return pool[hashString(seed) % pool.length];
}
