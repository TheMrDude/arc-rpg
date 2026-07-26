/**
 * Draining the reward chain, extracted so it can be proven.
 *
 * HOLLOW PASS 2. This used to live inline in production.spec.js as
 * `.click().catch(() => {})` in a loop, which meant an overlay whose dismiss
 * button was present but genuinely unclickable -- covered by a higher layer,
 * pointer-events disabled, off-screen: every overlay bug that reached a
 * nine-year-old -- was swallowed up to eight times and the helper returned as
 * though it had cleared the screen. The next assertion then failed somewhere
 * else entirely, pointing at the wrong component.
 *
 * Out here it is exercised against fixtures reproducing each of those states in
 * tests/overlays/reward-dismiss.spec.js, which runs on every push and needs no
 * production access. `expect` is injected so the helper carries no dependency on
 * which project is running it.
 */

const DISMISS_LABELS =
  /Continue Your Journey|Continue|Claim|Awesome|Nice|Got it|Keep going|Close|Skip/i;

/**
 * Completing a quest can queue a celebration, a reflection, a dice roll and a
 * chest drop, and which of them appear is partly random -- so this drains rather
 * than assumes a fixed number.
 *
 * Never uses { force: true }. Forcing a click through an overlay would make the
 * test pass while a child was still stuck behind it, which is the exact failure
 * this suite exists to catch.
 *
 * @returns {Promise<string[]>} the labels dismissed, in order
 */
async function clearRewardModals(page, { expect, max = 8, settleMs = 900 } = {}) {
  const dismissed = [];

  for (let i = 0; i < max; i++) {
    const button = page.getByRole('button', { name: DISMISS_LABELS }).first();
    if (!(await button.count())) break;
    if (!(await button.isVisible().catch(() => false))) break;

    const name = (await button.textContent().catch(() => '')) || '(unnamed)';
    try {
      // No force, no catch. A reward modal a child cannot dismiss must go red.
      await button.click({ timeout: 5000 });
    } catch (err) {
      // Name the culprit in the LOG, not just a trace artifact. A click times out
      // because the button is covered, moving, or disabled -- so report which,
      // and what a tap at its centre would actually land on. This is the
      // difference between "some modal is stuck" and a one-line fix.
      const diag = await button
        .evaluate((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const hit = document.elementFromPoint(cx, cy);
          const describe = (n) => {
            if (!n) return 'nothing';
            const cs = getComputedStyle(n);
            const cls =
              typeof n.className === 'string' && n.className.trim()
                ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.')
                : '';
            return `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${cls} [z:${cs.zIndex}, pos:${cs.position}, pe:${cs.pointerEvents}]`;
          };
          const covered = hit && hit !== el && !el.contains(hit);
          return {
            box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
            disabled: el.disabled === true,
            coveredBy: covered ? describe(hit) : null,
          };
        })
        .catch(() => null);

      const cause = diag
        ? diag.coveredBy
          ? `a tap at its centre lands on ${diag.coveredBy} instead`
          : diag.disabled
          ? 'the button is disabled'
          : `the button is uncovered and enabled at ${JSON.stringify(diag.box)} -- likely still moving (unstable)`
        : 'could not inspect the button';

      throw new Error(
        `reward modal "${name.trim()}" is on screen but its dismiss button could not ` +
          `be clicked after ${dismissed.length} previous dismissal(s) ` +
          `[${dismissed.join(' -> ') || 'none'}]. A child would be stuck here. ` +
          `Why: ${cause}. Underlying error: ${String(err.message).split('\n')[0]}`
      );
    }
    dismissed.push(name.trim());
    await page.waitForTimeout(settleMs);
  }

  // The real exit condition: the dashboard is usable again. Running out of
  // matching buttons is not evidence of that -- a modal whose only control is
  // unmatched ("Rate my mood") ends the loop above looking exactly like success.
  const input = page.getByPlaceholder('Enter your task...');
  const trail = dismissed.join(' -> ') || 'nothing';
  await expect(
    input,
    `the quest input is not on the page after dismissing [${trail}]`
  ).toBeVisible({ timeout: 20_000 });

  // toBeVisible is NOT enough, and this cost a round of this very proof:
  // Playwright's "visible" means in the DOM with a non-empty box, which a
  // full-screen overlay sitting on top does not change. The input tested as
  // visible while a modal covered it -- the same false negative as the original
  // swallowed clicks. So hit-test: whatever the browser would deliver a tap to at
  // the input's centre must be the input itself.
  const blocker = await input.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || hit === el || el.contains(hit)) return null;
    const id = [
      hit.tagName.toLowerCase(),
      hit.id ? `#${hit.id}` : '',
      hit.className && typeof hit.className === 'string'
        ? `.${hit.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : '',
    ].join('');
    const cs = getComputedStyle(hit);
    return `${id} [z-index: ${cs.zIndex}, position: ${cs.position}]`;
  });

  if (blocker) {
    throw new Error(
      `the quest input is still blocked after dismissing [${trail}] -- a tap at its ` +
        `centre would land on ${blocker} instead. A reward overlay is still up, or a ` +
        `new one has no recognised dismiss control. A child would be stuck here.`
    );
  }

  return dismissed;
}

module.exports = { clearRewardModals, DISMISS_LABELS };
