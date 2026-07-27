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

  // Is a tap at this control's own centre actually delivered to it? A child taps
  // what is on top; so must this. Returns false for a control sitting BEHIND an
  // open overlay's backdrop -- which is what made the first version pick the wrong
  // button. The production smoke landed on a dashboard "Close" button that was
  // earlier in the DOM than -- and covered by -- an open reward overlay portalled
  // to <body>. `.first()` in document order chose the covered one and called the
  // screen "stuck"; a real child would have tapped the overlay's own ✕ on top.
  const isTopmost = (loc) =>
    loc
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      })
      .catch(() => false);

  for (let i = 0; i < max; i++) {
    // Pick the dismiss control a child would actually tap: the topmost REWARD
    // control. Match on DISMISS_LABELS, never on the raw shell close button --
    // that would also dismiss a blocking prompt like the companion hatch (whose
    // ✕ reads "I'll decide later", deliberately NOT a reward label), which the
    // smoke's very next step needs to still be on screen. A reward overlay's own
    // ✕ carries a reward label ("Continue your journey", "Claim reward"), so
    // DISMISS_LABELS reaches it; the hatch is left alone.
    let target = null;
    let name = '';

    // The first labelled dismiss control that is genuinely on top, so a real tap
    // would reach it -- never one covered by an overlay it sits behind (the
    // document-order trap the production smoke hit).
    const candidates = page.getByRole('button', { name: DISMISS_LABELS });
    const count = await candidates.count();
    for (let k = 0; k < count; k++) {
      const c = candidates.nth(k);
      if (!(await c.isVisible().catch(() => false))) continue;
      if (!(await isTopmost(c))) continue;
      target = c;
      // The accessible name -- what getByRole matched on and what a screen
      // reader announces. A reward overlay's ✕ carries its intent in aria-label
      // ("Continue your journey"), and its bare "✕" text content would name the
      // control uselessly in a failure message; prefer the label.
      name =
        (await c.getAttribute('aria-label').catch(() => null)) ||
        (await c.textContent().catch(() => '')) ||
        '(unnamed)';
      break;
    }

    // Nothing clickable to dismiss. Either the screen is already clear, or a
    // genuinely stuck overlay remains -- the hit-test on the quest input below
    // decides which, and reds if a child would be trapped. This is the same trap
    // detection as before; it just no longer fires on a harmless button parked
    // behind an overlay that has its own reachable ✕.
    if (!target) break;

    const button = target;
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
          // The class-trail up from the blocker names the component that owns it,
          // even when the blocker itself is a bare styled-jsx div with no
          // identifying class of its own.
          const ancestry = (n) => {
            const trail = [];
            for (let a = n; a && a !== document.body && trail.length < 8; a = a.parentElement) {
              const cls =
                typeof a.className === 'string' && a.className.trim()
                  ? '.' + a.className.trim().split(/\s+/).filter((c) => !/^jsx-/.test(c)).slice(0, 2).join('.')
                  : '';
              trail.push(`${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${cls}`);
            }
            return trail.join(' < ');
          };
          const covered = hit && hit !== el && !el.contains(hit);
          return {
            box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
            disabled: el.disabled === true,
            coveredBy: covered ? describe(hit) : null,
            blockerAncestry: covered ? ancestry(hit) : null,
            blockerHtml: covered ? (hit.outerHTML || '').replace(/\s+/g, ' ').slice(0, 160) : null,
            matchedAncestry: ancestry(el),
          };
        })
        .catch(() => null);

      const cause = diag
        ? diag.coveredBy
          ? `a tap at its centre lands on ${diag.coveredBy} instead.\n` +
            `    blocker ancestry: ${diag.blockerAncestry}\n` +
            `    blocker html: ${diag.blockerHtml}\n` +
            `    matched-button ancestry: ${diag.matchedAncestry}`
          : diag.disabled
          ? 'the button is disabled'
          : `the button is uncovered and enabled at ${JSON.stringify(diag.box)} -- likely still moving (unstable).\n` +
            `    matched-button ancestry: ${diag.matchedAncestry}`
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

  // A blocking prompt she must answer -- the companion hatch, onboarding -- is a
  // shell dialog whose controls are deliberately NOT reward labels (the hatch's ✕
  // reads "I'll decide later"), so the drain above correctly leaves it up. That is
  // not a stuck child: it is the next thing she does, and the smoke's very next
  // step asserts it is on screen. Recognise it and stop, rather than failing the
  // input hit-test it legitimately covers.
  //
  // This cannot mask a real trap. Any REWARD overlay still up would have carried a
  // reward-labelled ✕ that the loop above dismissed; and if a dialog's own control
  // were genuinely covered (the bug this suite catches), the topmost hit-test
  // below fails and `answerable` is false, so we fall through and red as before.
  const blockingDialog = page.locator('[data-overlay-surface][role="dialog"]');
  if (await blockingDialog.count()) {
    const answerable = await blockingDialog.first().evaluate((surf) => {
      const controls = surf.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      for (const el of controls) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && (hit === el || el.contains(hit))) return true;
      }
      return false;
    });
    if (answerable) return dismissed;
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
