/**
 * Weekly Boss Battles: one boss per user per ISO week. Every completed
 * quest deals 1 damage. Kill it before the week ends for rewards. If the
 * week ends first, the boss simply slips away into the mist. It will
 * return. Never damage to the player, never a loss, never guilt.
 *
 * Boss selection is deterministic per user+week (djb2 hash, same pattern
 * as lib/storyBeats.js) so refreshes and multiple devices always agree.
 */

export const BOSSES = [
  {
    id: 'procrastination-wraith',
    name: 'The Procrastination Wraith',
    icon: '👻',
    flavor: 'It whispers "later" and grows fat on unstarted things.',
    hitLines: [
      'The Wraith flinches. "Later" just became "now".',
      'Your strike burns a hole in the fog of delay.',
      'It hisses. It hates it when you just start.',
      'The whisper of "someday" grows fainter.',
    ],
    defeatLine: 'The Wraith dissolves. It was only ever as strong as the waiting.',
  },
  {
    id: 'doomscroll-serpent',
    name: 'The Doomscroll Serpent',
    icon: '🐍',
    flavor: 'Endless coils, endless feeds. It wants your attention. All of it.',
    hitLines: [
      'The Serpent loses a coil. Your focus cuts deep.',
      'It rattles. One less hour lost to the scroll.',
      'Your strike lands. The endless feed flickers and dims.',
      'The Serpent blinks first. You looked up.',
    ],
    defeatLine: 'The Serpent unwinds and slinks off. Your attention is yours again.',
  },
  {
    id: 'clutter-golem',
    name: 'The Clutter Golem',
    icon: '🗿',
    flavor: 'Built from every pile you meant to sort. It gets heavier by the day.',
    hitLines: [
      'A chunk of clutter crumbles from its shoulder.',
      'The Golem staggers. Order is a sharp blade.',
      'Cracks spread through its junk-drawer heart.',
      'It sheds a drawer of mystery cables. Progress.',
    ],
    defeatLine: 'The Golem collapses into tidy rubble. Somewhere, a shelf breathes easier.',
  },
  {
    id: 'snooze-baron',
    name: 'The Snooze Baron',
    icon: '😴',
    flavor: 'Sovereign of the Kingdom of Five More Minutes.',
    hitLines: [
      'The Baron\'s crown slips. You are wide awake.',
      'His velvet robe tears. The morning is yours to keep.',
      'He yawns, wounded. The alarm sings your song now.',
      'The royal pillow fort loses a wall.',
    ],
    defeatLine: 'The Baron abdicates. The morning throne belongs to you.',
  },
  {
    id: 'fog-of-someday',
    name: 'The Fog of Someday',
    icon: '🌫️',
    flavor: 'A gray mist where plans drift and wait forever.',
    hitLines: [
      'The Fog thins. You can see tomorrow from here.',
      'Your deed cuts a bright path through the gray.',
      'The mist recoils from a thing actually done.',
      'A patch of clear sky opens overhead.',
    ],
    defeatLine: 'The Fog lifts. Someday looked a lot like today all along.',
  },
  {
    id: 'inbox-hydra',
    name: 'The Inbox Hydra',
    icon: '🐉',
    flavor: 'Cut one head and two arrive by morning. It thrives on the unread.',
    hitLines: [
      'A head drops. The Hydra counts its losses.',
      'Your strike lands with a satisfying archive swoosh.',
      'The Hydra shrieks. Zero is coming for it.',
      'One less head. It is doing the math and worrying.',
    ],
    defeatLine: 'The Hydra sinks beneath the surface. Blessed silence follows.',
  },
];

// Small deterministic string hash (djb2-ish, unsigned) — same approach
// as lib/storyBeats.js so the pick is stable across refreshes/devices.
function hashString(input) {
  const str = String(input || '');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Deterministically pick this user's boss for a given ISO week. */
export function pickBossForWeek(userId, weekKey) {
  return BOSSES[hashString(`${userId}:${weekKey}`) % BOSSES.length];
}

/** Look up a boss definition (for hit/defeat lines) by id. */
export function getBossById(id) {
  return BOSSES.find((b) => b.id === id) || null;
}

/**
 * Boss HP scales gently with level: 5 HP at low levels, +1 per 5 levels,
 * capped at 9 HP from level 20 on. Always killable in a week of small wins.
 */
export function bossMaxHp(level) {
  return 5 + Math.min(Math.floor((level || 1) / 5), 4);
}

/** Pick a random hit line for a boss id (fallback keeps copy warm, not empty). */
export function randomHitLine(bossId) {
  const boss = getBossById(bossId);
  const lines = boss?.hitLines?.length ? boss.hitLines : ['Your strike lands true.'];
  return lines[Math.floor(Math.random() * lines.length)];
}

/* ── Server-side helpers (service-role client only; RLS blocks user writes) ── */

/**
 * Mark any still-'active' bosses from previous weeks as 'retreated'.
 * Retreat is neutral by design: the boss slips away into the mist, the
 * player loses nothing. Best-effort; callers may ignore errors.
 */
export async function retireStaleBosses(supabaseAdmin, userId, currentWeekKey) {
  await supabaseAdmin
    .from('weekly_boss_battles')
    .update({ status: 'retreated' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('week_key', currentWeekKey);
}

/**
 * Get this week's boss row for a user, creating it (deterministic pick,
 * level-scaled HP) if it does not exist yet. Race-safe: on a unique
 * violation from a concurrent insert we re-select the winner's row.
 * Returns the row or null.
 */
export async function getOrCreateWeeklyBoss(supabaseAdmin, userId, level, weekKey) {
  const { data: existing } = await supabaseAdmin
    .from('weekly_boss_battles')
    .select('*')
    .eq('user_id', userId)
    .eq('week_key', weekKey)
    .maybeSingle();

  if (existing) return existing;

  const boss = pickBossForWeek(userId, weekKey);
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('weekly_boss_battles')
    .insert({
      user_id: userId,
      week_key: weekKey,
      boss_id: boss.id,
      boss_name: boss.name,
      boss_icon: boss.icon,
      boss_flavor: boss.flavor,
      max_hp: bossMaxHp(level),
      damage_dealt: 0,
      status: 'active',
    })
    .select()
    .single();

  if (inserted) return inserted;

  if (insertError) {
    // unique (user_id, week_key): another request created it first
    const { data: winner } = await supabaseAdmin
      .from('weekly_boss_battles')
      .select('*')
      .eq('user_id', userId)
      .eq('week_key', weekKey)
      .maybeSingle();
    return winner || null;
  }

  return null;
}
