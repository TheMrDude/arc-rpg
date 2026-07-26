/**
 * Journal narration voices, in one place.
 *
 * This map was byte-identical in app/api/journal/transform/route.js and
 * app/api/transform-journal/route.js, so a fix to one silently missed the other.
 * Both now import from here.
 *
 * These voices audited clean: shadow as "introspective... inner landscapes to
 * navigate" is the register we want everywhere, and it is what the quest
 * generator's "stealth mission" should have been all along.
 */
export const ARCHETYPE_JOURNAL_VOICES = {
  warrior: 'determined, courageous, action-oriented - frames struggles as battles to overcome',
  builder: 'pragmatic, constructive, steady - frames challenges as projects to build through',
  shadow: 'introspective, strategic, deep - frames emotions as inner landscapes to navigate',
  sage: 'wise, reflective, philosophical - frames experiences as lessons and growth',
  seeker: 'curious, adventurous, open - frames life as an ongoing journey of discovery',
};

export const DEFAULT_JOURNAL_VOICE = ARCHETYPE_JOURNAL_VOICES.warrior;
