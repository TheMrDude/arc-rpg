/**
 * The Storybook: cast characters the player MEETS by completing quests.
 *
 * Every MEET_EVERY completed quests, the next character in MEETING_ORDER
 * appears once as a reward-priority overlay, says one line, and is written
 * into profiles.met_characters forever. The Storybook page lets the child
 * reread everyone they have met; unmet characters show as mystery tiles.
 *
 * Design rules, same spirit as lib/companions.js:
 * - Characters are never disappointed and never mention missed days.
 * - Meeting is earned by doing quests. There is no purchase, no gambling,
 *   no rarity. The order is fixed so every child meets everyone.
 * - One meet per quest completion at most, so a returning veteran catches
 *   up one friend at a time instead of drowning in overlays.
 *
 * Art lives in public/images/cast (see lib/cast.js). Where a character has
 * two style variants, one canonical variant appears here.
 */

import { CAST } from '@/lib/cast';

export const MEET_EVERY = 3;

// Curated narrative order: grounded, friendly faces first; the cosmic and
// legendary characters wait deep in the journey. One entry per character --
// slugs reference lib/cast.js keys.
export const MEETING_ORDER = [
  { slug: 'acorn_ranger', beat: "Fresh tracks! I knew a new hero would come this way. I'll keep my compass pointed at you." },
  { slug: 'puddle_wisp', beat: "You showed up even today? Splendid! Splash on through, the rain is just extra sparkle." },
  { slug: 'sunspin', beat: 'Every quest you finish makes my sundial spin a little faster. Keep dancing!' },
  { slug: 'teacup_sprout', beat: 'I grow one leaf every time you finish something. Look, a new leaf, thanks to you.' },
  { slug: 'frost_kit', beat: "Caught it! I've been saving this snowball for someone worth cheering for." },
  { slug: 'satchel_raccoon', beat: "Ooh, you're the one filling the quest board! Stick with me, treasure follows the busy." },
  { slug: 'sprig', beat: "The garden heard about your quests. It's blooming early this year because of you." },
  { slug: 'gale_sprite', beat: "I raced the wind here to meet you. You're faster than you think, you know." },
  { slug: 'petal_sprite_a', beat: 'Habits are like flowers. Water them a little every day and... oh look, you already know!' },
  { slug: 'lantern_wisp', beat: "It's never too dark to keep going. I'll hold the light while you take the next step." },
  { slug: 'cinder_smith', beat: "Every finished quest is a coal in my forge. You're keeping the fire warm, hero." },
  { slug: 'fern_fox', beat: 'I followed your trail through the snow. It goes farther than you remember making it.' },
  { slug: 'beat_sprite', beat: 'Your quest rhythm? Perfection. Mind if I drop a beat every time you press Complete?' },
  { slug: 'luna_monk', beat: 'Rest is part of the quest too. The moon takes nights off and still lights the whole sky.' },
  { slug: 'dreamfox', beat: 'I nap on the moon and dream about heroes. Lately, you keep showing up in the good ones.' },
  { slug: 'moss_warden', beat: 'Stone by stone, leaf by leaf. Slow growing is still growing. You understand that already.' },
  { slug: 'runeseeker', beat: "These runes spell your name now. Don't ask how. Investigator's secret." },
  { slug: 'star_scout', beat: 'My telescope found a new constellation last night. It looks suspiciously like you.' },
  { slug: 'coral_mermaid', beat: 'News travels fast underwater. Even the jellyfish are talking about your quests.' },
  { slug: 'vinewhisker', beat: 'The jungle only shows its waterfalls to friends. Consider yourself a friend.' },
  { slug: 'cinderpaw', beat: 'I only wake up for interesting heroes. *yawn* You may pet the fire cat. Carefully.' },
  { slug: 'forge_cat', beat: 'Deep in the mines we have a saying: every swing counts, even the little ones.' },
  { slug: 'dune_runner', beat: "I've crossed a hundred deserts. The secret? One step, then another. You've got the knack." },
  { slug: 'gingerhorn', beat: "Sweet AND tough, that's the recipe. You're proof it works." },
  { slug: 'harlequin', beat: 'A trick! No wait, a treat. For you, hero, always a treat. ...Probably.' },
  { slug: 'paper_wisp', beat: "Special delivery! A paper crane for every quest. At this rate I'll need more paper." },
  { slug: 'archive_fairy', beat: 'Your story takes up a whole shelf in my library now. I had to move the dictionaries.' },
  { slug: 'lute_sprite', beat: "I wrote a song about your adventure. It's mostly humming so far, but it's catchy." },
  { slug: 'nightbloom', beat: 'Some flowers only open at night. Some heroes shine on the quiet days. Hello, quiet-day hero.' },
  { slug: 'emberling', beat: "Dance with me! Every quest is a spark, and tonight we've got PLENTY." },
  { slug: 'aurora_kit', beat: "The sky lights up like this when someone keeps their promises. Tonight's show is yours." },
  { slug: 'star_whelp', beat: "I guard this orb full of wishes. Yours are in there too. They're doing great." },
  { slug: 'glimmer_seer', beat: "My mirror shows who you're becoming. Want a peek? ...Patience. Keep questing." },
  { slug: 'inkwraith', beat: "I write down every deed. Yours needed a second scroll. Do slow down. (Don't.)" },
  { slug: 'stellara', beat: 'I was about to fall asleep on this cloud, but your quest woke the stars up. Worth it.' },
  { slug: 'prism_knight_b', beat: 'A knight guards what matters. You guard your habits. We are the same, you and I.' },
  { slug: 'star_witch_chibi', beat: 'I flew past three constellations to meet you. The stars gossip, and you are the headline.' },
  { slug: 'voltwing_chibi', beat: "ZAP! Sorry, excited. You've got momentum, real crackling momentum. Don't touch anything metal." },
  { slug: 'umbrawhelp_a', beat: 'Even shadow dragons need friends. You finished enough quests to find me. That is rare.' },
  { slug: 'celeste', beat: 'I only appear to heroes who kept going when nobody was watching. Welcome to the legend.' },
];

export const ROSTER_SIZE = MEETING_ORDER.length;

/** Set of slugs that are valid to record as met (server-side validation). */
export const VALID_MEET_SLUGS = new Set(MEETING_ORDER.map((m) => m.slug));

/** Normalise whatever is stored in profiles.met_characters into a string[]. */
export function normalizeMet(met) {
  if (!Array.isArray(met)) return [];
  return met.filter((s) => typeof s === 'string' && VALID_MEET_SLUGS.has(s));
}

/**
 * The next character due to be met, or null.
 *
 * Earned meets = floor(questsCompleted / MEET_EVERY), capped at the roster.
 * If the child has met fewer characters than earned, the next unmet character
 * in MEETING_ORDER is due. At most one is returned; the caller shows at most
 * one per quest completion.
 */
export function dueMeet(questsCompleted, met) {
  const metList = normalizeMet(met);
  const earned = Math.min(
    Math.floor((questsCompleted || 0) / MEET_EVERY),
    ROSTER_SIZE
  );
  if (metList.length >= earned) return null;
  const metSet = new Set(metList);
  const next = MEETING_ORDER.find((m) => !metSet.has(m.slug));
  if (!next) return null;
  const art = CAST[next.slug];
  return art ? { ...next, ...art } : null;
}

/**
 * Display names of met characters, newest first, for the journey chapter
 * cameos. Deduped (style variants share a name) and capped so the AI prompt
 * stays small.
 */
export function metCharacterNames(met, limit = 6) {
  const names = [];
  for (const slug of normalizeMet(met).slice().reverse()) {
    const name = CAST[slug]?.name;
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= limit) break;
  }
  return names;
}

/** Full roster with met flags, for the Storybook page. */
export function storybookEntries(met) {
  const metSet = new Set(normalizeMet(met));
  return MEETING_ORDER.map((m, i) => ({
    ...m,
    ...CAST[m.slug],
    order: i + 1,
    met: metSet.has(m.slug),
  }));
}
