/**
 * The reward payout is claimed exactly once, however it is closed.
 *
 * Once "close applies the reward" is wired, a reward overlay has four close paths
 * that all pay out: the Claim button, the shell's ✕, Escape, and a backdrop tap.
 * A fast double input -- two of them landing in the same tick -- used to claim
 * twice. This app has already eaten a 16,500-gold exploit from a stale id, so the
 * guard lives in the queue (the source), not in a component trusted to
 * deduplicate its own inputs.
 *
 * No browser: claimReward is plain module state, so this asserts against it
 * directly and runs in the fast overlays project alongside the other invariants.
 */
const { test, expect } = require('@playwright/test');
const {
  claimReward, requestSlot, resetQueue, hasPendingReward, OVERLAY_PRIORITY,
} = require('../../lib/overlayQueue');

test.describe('reward claim idempotency', () => {
  test.beforeEach(() => resetQueue());

  test('two claim paths in the same tick pay out exactly once', () => {
    requestSlot('dice-roll', OVERLAY_PRIORITY.REWARD);

    let payouts = 0;
    // The ✕ and Escape both fire close->claim in the same synchronous tick.
    const closeToClaim = () => { if (claimReward('dice-roll')) payouts += 1; };
    closeToClaim();
    closeToClaim();

    expect(payouts, 'exactly one payout across two same-tick close paths').toBe(1);
    expect(hasPendingReward('dice-roll'), 'the claimed reward is forgotten').toBe(false);
  });

  test('the first path wins and every later path is a no-op', () => {
    requestSlot('dice-roll', OVERLAY_PRIORITY.REWARD);
    expect(claimReward('dice-roll')).toBe(true);
    // Backdrop, then the Claim button, arriving after the ✕ already claimed.
    expect(claimReward('dice-roll')).toBe(false);
    expect(claimReward('dice-roll')).toBe(false);
  });

  test('a fresh encounter re-arms the same reward id', () => {
    requestSlot('dice-roll', OVERLAY_PRIORITY.REWARD);
    expect(claimReward('dice-roll')).toBe(true);
    expect(claimReward('dice-roll')).toBe(false);

    // The next encounter reuses the id; requesting the slot clears the guard so
    // it is claimable once more -- and still only once.
    requestSlot('dice-roll', OVERLAY_PRIORITY.REWARD);
    expect(claimReward('dice-roll')).toBe(true);
    expect(claimReward('dice-roll')).toBe(false);
  });
});
