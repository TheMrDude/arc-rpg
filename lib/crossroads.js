/**
 * Crossroads: every 5th completed quest opens a fork in the road. The
 * player picks a path, a d20 decides how it goes, and the outcome is
 * written into their story. This is the first slice of DM-style play:
 * choices + dice altering the storyline.
 *
 * Design rules:
 * - The d20 is rolled SERVER-SIDE (the API route). The client only animates.
 * - Bold choices swing harder (more complications, same crit ceiling).
 *   Careful choices are steadier. Both always pay something.
 * - There is no losing outcome. A complication is a story, not a fine.
 */

export const CROSSROADS_SCENARIOS = [
  {
    id: 'rope_bridge',
    icon: '🌉',
    title: 'The Fraying Bridge',
    setup:
      'A rope bridge sways over the gorge. A weathered sign reads: "Fine most days." A goat watches you with an unhelpful expression.',
    choices: [
      {
        id: 'bold',
        label: 'Sprint across before it can decide to break',
        style: 'bold',
        outcomes: {
          crit: 'You cross so fast the bridge applauds. A merchant on the far side pays you for the inspiration.',
          great: 'Three planks snap behind you but ahead of the goat. It nods, impressed. Coins wait on the far side.',
          success: 'You make it across with all limbs and most of your dignity.',
          complication: 'Halfway across you must carry the goat. It is heavier than it looks. You both arrive fine, but it tells everyone.',
        },
      },
      {
        id: 'careful',
        label: 'Test every plank like a professional',
        style: 'careful',
        outcomes: {
          crit: 'You find a smuggler cache strapped beneath the fourth plank. Finders keepers is the law of gorges.',
          great: 'Slow and steady. On the far side, a grateful traveler follows your exact footsteps and tips you.',
          success: 'Methodical. Effective. Across without incident.',
          complication: 'It takes an hour. The goat crosses in nine seconds and waits, chewing loudly.',
        },
      },
    ],
  },
  {
    id: 'lantern_stranger',
    icon: '🏮',
    title: 'The Stranger at the Fire',
    setup:
      'A hooded figure by a roadside fire offers you stew and says nothing. The stew smells outstanding. The silence smells like a story.',
    choices: [
      {
        id: 'bold',
        label: 'Sit down, eat, and ask who they really are',
        style: 'bold',
        outcomes: {
          crit: 'A retired legend of your own archetype. They teach you one trick and pay for the pleasure of good company.',
          great: 'A traveling gold assayer. The stew is great and the career advice is better.',
          success: 'A quiet shepherd. Good stew. Better silence. You leave rested.',
          complication: 'They talk for four hours about their invention: a hat for horses. You now know everything about horse hats.',
        },
      },
      {
        id: 'careful',
        label: 'Accept the stew, keep your hood up too',
        style: 'careful',
        outcomes: {
          crit: 'Two professionals respecting the craft. They leave a pouch by your boot as tribute between equals.',
          great: 'A perfect wordless meal. Under your bowl, a coin and a map fragment.',
          success: 'You eat, nod, and part ways. Some encounters are complete exactly as they are.',
          complication: 'You both reach for the ladle at the same moment, twice. It is the most stressful soup of your life.',
        },
      },
    ],
  },
  {
    id: 'flooded_cellar',
    icon: '🗝️',
    title: 'The Innkeeper’s Cellar',
    setup:
      'An innkeeper flags you down: something is thumping under her cellar door, and her cat refuses to come downstairs. She offers her best key and a candle.',
    choices: [
      {
        id: 'bold',
        label: 'Go down with the candle held high',
        style: 'bold',
        outcomes: {
          crit: 'A cask of pre-war mead rolled loose against a beam. She splits the sale of it with you on the spot.',
          great: 'A trapped badger, escorted out with honor. The innkeeper pays well and names a stew after you.',
          success: 'A loose shutter and an overactive imagination. She insists you take something for the trouble.',
          complication: 'It is the cat. It came down after all and wanted the door opened from the inside. It does not thank you.',
        },
      },
      {
        id: 'careful',
        label: 'Listen at the door and map the thumps first',
        style: 'careful',
        outcomes: {
          crit: 'Your rhythm analysis finds a hollow wall, and behind it, the previous owner’s strongbox. The innkeeper shares it.',
          great: 'You deduce the loose cask, wedge the door, and stop it mid-roll like a professional. Paid in full.',
          success: 'You identify the shutter by sound alone. She is thoroughly impressed by the technique.',
          complication: 'You press your ear to the door as she opens it. You meet the floor. The cat watches from the stairs.',
        },
      },
    ],
  },
  {
    id: 'moonlit_market',
    icon: '🌙',
    title: 'The Midnight Market',
    setup:
      'You find a market that only exists after moonrise. Stalls sell bottled weather, secondhand luck, and maps of places that are shy. A vendor waves you over.',
    choices: [
      {
        id: 'bold',
        label: 'Haggle for the unlabeled bottle',
        style: 'bold',
        outcomes: {
          crit: 'Bottled tailwind, vintage. The vendor is so charmed by your nerve she pays YOU to tell people where you got it.',
          great: 'Secondhand luck, barely used. You feel it settle in your pockets as coins.',
          success: 'A pleasant breeze in a jar. Worth exactly what you paid, which is the market’s highest compliment.',
          complication: 'Bottled Tuesday. Not even a good Tuesday. The vendor throws in a coin out of embarrassment.',
        },
      },
      {
        id: 'careful',
        label: 'Browse everything, buy only what you understand',
        style: 'careful',
        outcomes: {
          crit: 'You spot a mispriced map of the Sunken City and resell it to a collector three stalls down. Clean work.',
          great: 'A fair trade, a firm handshake, and change counted twice. The vendor respects it and rounds up.',
          success: 'You leave with a sensible purchase and all your original luck.',
          complication: 'You examine one stall so long the market starts to fold up around you politely, like a tide going out.',
        },
      },
    ],
  },
  {
    id: 'old_rival',
    icon: '⚔️',
    title: 'The Friendly Rival',
    setup:
      'Someone from your early questing days blocks the path, grinning. "Still at it?" they ask, flipping a coin. "Race you to the milestone marker. Loser buys."',
    choices: [
      {
        id: 'bold',
        label: 'Race them, full speed, no warm-up',
        style: 'bold',
        outcomes: {
          crit: 'You win by a distance that requires an apology. They pay up laughing and spread the legend for free.',
          great: 'You win at the line by a boot length. Their coin purse opens with good grace.',
          success: 'A dead heat. You split the bill and the bragging rights, which is somehow better.',
          complication: 'You take an early lead directly into a hedge. You finish the race wearing part of it. They pay anyway, for the show.',
        },
      },
      {
        id: 'careful',
        label: 'Propose a wager on consistency instead',
        style: 'careful',
        outcomes: {
          crit: '"Most quests by moonrise" was a mistake for them and a masterpiece for you. They pay double, impressed.',
          great: 'Your pacing wins it. They hand over the stake and ask, sincerely, how you stay so steady.',
          success: 'You both hit your marks. The wager becomes a standing tradition and tonight, they still buy.',
          complication: 'They counter-propose seventeen rule amendments. Negotiations outlast the daylight. You get a settlement fee.',
        },
      },
    ],
  },
  {
    id: 'library_owl',
    icon: '🦉',
    title: 'The Overdue Book',
    setup:
      'An enormous owl lands in front of you holding a library book in its talons. The stamp says it was due back to the Salt Library eleven years ago. The owl stares, meaningfully.',
    choices: [
      {
        id: 'bold',
        label: 'Take the book and return it yourself',
        style: 'bold',
        outcomes: {
          crit: 'The librarian weeps. The book is the lost second volume. The finder’s reward has been accruing interest for eleven years.',
          great: 'Returned with ceremony. The library waives all your future fees and pays the standard courier rate, doubled.',
          success: 'Returned, stamped, shelved. The owl hoots once in what you choose to believe is respect.',
          complication: 'The book is in Owl. The librarian needs you to wait while she finds the translation desk. The owl waits with you. Smugly.',
        },
      },
      {
        id: 'careful',
        label: 'Ask the owl some clarifying questions first',
        style: 'careful',
        outcomes: {
          crit: 'The owl, delighted to be consulted, leads you to its hoard of other overdue books. The bulk return bounty is substantial.',
          great: 'Through patient nodding you establish the terms. The owl pays a courier fee in antique coins.',
          success: 'The interview concludes. You take the job. The owl supervises the whole delivery from above.',
          complication: 'The owl answers every question with the same hoot. You learn nothing but somehow agree to the job anyway.',
        },
      },
    ],
  },
];

// Gold by outcome tier. Every tier pays. Complications pay the least but
// generate the best stories, which is accurate to real adventuring.
export const CROSSROADS_REWARDS = {
  crit: 150,
  great: 80,
  success: 40,
  complication: 15,
};

// Small deterministic hash (same djb2 family as storyBeats/bosses)
function hashString(input) {
  const str = String(input || '');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** The milestone a player is currently at (every 5 completed quests). */
export function crossroadsMilestone(questsCompleted) {
  return Math.floor((questsCompleted || 0) / 5) * 5;
}

/** Is a crossroads waiting for this profile? */
export function crossroadsEligible(profile) {
  const milestone = crossroadsMilestone(profile?.quests_completed);
  const claimed = profile?.story_progress?.crossroads_claimed || 0;
  return milestone >= 5 && claimed < milestone;
}

/** Deterministic scenario for a user + milestone (same on every device). */
export function pickScenario(userId, milestone) {
  return CROSSROADS_SCENARIOS[
    hashString(`${userId}:crossroads:${milestone}`) % CROSSROADS_SCENARIOS.length
  ];
}

/**
 * Map a d20 roll to an outcome tier, by choice style.
 * Bold swings harder; careful is steadier. Crit is always a natural 20.
 */
export function tierForRoll(roll, style) {
  if (roll >= 20) return 'crit';
  if (style === 'bold') {
    if (roll >= 17) return 'great';
    if (roll >= 10) return 'success';
    return 'complication';
  }
  // careful
  if (roll >= 15) return 'great';
  if (roll >= 5) return 'success';
  return 'complication';
}
