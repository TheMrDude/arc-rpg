'use client';

/**
 * Overlay queue: exactly one blocking overlay visible at a time, ever.
 *
 * The bug this exists to kill, observed live: after ONE quest completion, a
 * QuestCompletionCelebration (z-50, "+30 Gold") and a ReflectionPrompt (z-[55],
 * mood picker) were both mounted, both covering the Add Quest button, and a
 * nine-year-old could not get past either. There was no queue -- 36 components
 * each decided independently when to appear, and z-index decided who won.
 *
 * Design note on why this is a permission slip rather than a render host: a host
 * would mean moving 36 components' JSX into a registry, in one enormous diff, to
 * fix a problem that a boolean solves. Instead each overlay asks
 * `useOverlaySlot()` whether it is its turn and renders nothing if not. That
 * makes migration incremental and makes an unmigrated overlay's behaviour
 * unchanged rather than broken.
 */

import { useEffect, useState } from 'react';

/**
 * Lower number wins. The ordering principle: things she asked for, then things
 * that block progress, then things she earned, then decoration, then asks.
 *
 * REWARD before NARRATIVE is deliberate and is exactly the bug above -- a story
 * beat outranking a prompt about the quest she just finished. What she earned is
 * hers; narrative is decoration.
 */
export const OVERLAY_PRIORITY = {
  /** She tapped something and is waiting for the answer. */
  USER: 1,
  /** Blocks progress and has consequences: naming the hatch, onboarding. */
  BLOCKING: 2,
  /** Earned. Must never be silently dropped. */
  REWARD: 3,
  /** Story, reflection, flavour. */
  NARRATIVE: 4,
  /** Upsells and requests. Yields to everything. */
  ASK: 5,
};

const PERSIST_KEY = 'hq_overlay_pending_rewards';

/** id -> { priority, seq } */
const waiting = new Map();
const listeners = new Set();
let seq = 0;

function notify() {
  const holder = currentHolder();
  for (const fn of listeners) fn(holder);
}

/** The single overlay allowed on screen: best priority, then first to ask. */
export function currentHolder() {
  let best = null;
  for (const [id, rec] of waiting) {
    if (
      !best ||
      rec.priority < best.priority ||
      (rec.priority === best.priority && rec.seq < best.seq)
    ) {
      best = { id, ...rec };
    }
  }
  return best?.id ?? null;
}

export function requestSlot(id, priority) {
  if (waiting.has(id)) return;
  waiting.set(id, { priority, seq: seq++ });
  if (priority === OVERLAY_PRIORITY.REWARD) rememberReward(id);
  notify();
}

export function releaseSlot(id) {
  if (!waiting.delete(id)) return;
  forgetReward(id);
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Test/debug view. */
export function queueSnapshot() {
  return [...waiting.entries()]
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => a.priority - b.priority || a.seq - b.seq);
}

export function resetQueue() {
  waiting.clear();
  seq = 0;
  notify();
}

// ── Reward persistence ──────────────────────────────────────────────────────
// A queued reward must survive a route change. The module lives across a
// client-side navigation, but the COMPONENT unmounts and releases its slot, so
// without this a celebration that lost the race and then got navigated away from
// is gone for good. sessionStorage rather than localStorage: a reward should not
// resurrect in a tab opened next week.

function readPending() {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    return JSON.parse(sessionStorage.getItem(PERSIST_KEY) || '[]');
  } catch {
    return [];
  }
}

function writePending(ids) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (ids.length) sessionStorage.setItem(PERSIST_KEY, JSON.stringify(ids));
    else sessionStorage.removeItem(PERSIST_KEY);
  } catch {
    /* private mode: persistence is a nice-to-have, never a hard failure */
  }
}

function rememberReward(id) {
  const ids = readPending();
  if (!ids.includes(id)) writePending([...ids, id]);
}

function forgetReward(id) {
  writePending(readPending().filter((x) => x !== id));
}

/**
 * Ids of rewards that were queued and never shown. A reward overlay checks this
 * on mount so it re-queues itself after a navigation instead of vanishing.
 */
export function pendingRewardIds() {
  return readPending();
}

export function hasPendingReward(id) {
  return readPending().includes(id);
}

// ── The hook every overlay uses ─────────────────────────────────────────────

/**
 * Ask for the screen. Returns true only when it is this overlay's turn.
 *
 *   const visible = useOverlaySlot('quest-celebration', OVERLAY_PRIORITY.REWARD, show);
 *   if (!visible) return null;
 *
 * `active` is the component's own "should I be showing" condition. While it is
 * true but the slot is held by something higher priority, this returns false and
 * the overlay waits -- it does not disappear, and it does not stack.
 */
export function useOverlaySlot(id, priority, active) {
  const [holder, setHolder] = useState(() => currentHolder());

  useEffect(() => subscribe(setHolder), []);

  useEffect(() => {
    if (!active) return undefined;
    requestSlot(id, priority);
    return () => releaseSlot(id);
  }, [id, priority, active]);

  return Boolean(active) && holder === id;
}
