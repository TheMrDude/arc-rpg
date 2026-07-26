/**
 * clearRewardModals targets the control a child would actually tap: the topmost
 * one. Two production-smoke traps drove this, both reproduced here:
 *
 *  1. MomentumBoost's full-screen `fixed inset-0 z-40` transparent tap-catcher
 *     (pointer-events:auto) sat over the dashboard's "Close" button. No dismiss
 *     control was ever the topmost hit-test target, so the drain reds at the
 *     final input hit-test, naming the catcher. (The catcher is now removed from
 *     the app; this keeps the mechanism under test.)
 *  2. A migrated reward overlay (portalled, LATE in the DOM) was open over a
 *     dashboard "Close" button (EARLY in the DOM) matching DISMISS_LABELS.
 *     Document-order `.first()` chose the covered page button and called the
 *     screen stuck; the helper must dismiss the overlay's own ✕ first.
 */
const { test, expect } = require('@playwright/test');
const { clearRewardModals } = require('../smoke/rewardModals');

const page_ = (extra) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; font-family: system-ui; }
  .card { position: relative; margin: 24px; padding: 16px; background: #FFF9F1; color: #2b2b3a; }
  button { min-width: 44px; min-height: 44px; font-size: 16px; }
</style></head><body>
<main style="padding:24px"><label>Task <input placeholder="Enter your task..." /></label></main>
<!-- The TomorrowQuestHook suggestion card, dashboard-level (low stacking). -->
<div class="card">
  <h4>Choose tomorrow's quest</h4>
  <button aria-label="Close" onclick="this.closest('.card').remove()">✕</button>
</div>
${extra}
</body></html>`;

const serve = (page, html) =>
  page.route('**/fixture', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html })
  );

test.describe('MomentumBoost full-screen catcher', () => {
  test.use({ viewport: { width: 412, height: 915 } }); // Pixel 7, the smoke device

  test('a fixed inset-0 z-40 catcher over the Close button traps the drain', async ({ page }) => {
    await serve(
      page,
      page_(
        // MomentumBoost's tap-catcher, verbatim: fixed inset-0 z-40, pointer-events auto.
        `<div class="fixed inset-0 z-40" style="position:fixed;inset:0;z-index:40;background:transparent;pointer-events:auto"></div>`
      )
    );
    await page.goto('http://localhost/fixture');
    // The catcher covers the Close button AND the quest input, so no dismiss
    // control is ever the topmost hit-test target; the helper reaches the final
    // input hit-test and reds there, naming the z-40 catcher as the blocker.
    await expect(clearRewardModals(page, { expect })).rejects.toThrow(
      /would land on div.*z-index:\s*40|A child would be stuck here/is
    );
  });

  test('without the full-screen catcher, the Close button drains cleanly', async ({ page }) => {
    await serve(page, page_(''));
    await page.goto('http://localhost/fixture');
    const dismissed = await clearRewardModals(page, { expect });
    // Recorded by accessible name (aria-label="Close"), not the bare "✕" glyph.
    expect(dismissed).toEqual(['Close']);
  });

  test('an open shell overlay is dismissed before a page button behind it', async ({ page }) => {
    // The production trap: a migrated reward overlay is open (portalled, LATE in
    // the DOM), and the dashboard behind it has a "Close" button (EARLY in the
    // DOM) that DISMISS_LABELS matches but that sits under the overlay's backdrop.
    // Document-order `.first()` chose the covered page button and called the
    // screen stuck. The helper must instead dismiss the overlay's own ✕ first.
    await serve(
      page,
      page_(`
      <div data-overlay-root class="kidquest" style="position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center">
        <div data-overlay-backdrop aria-hidden="true" style="position:absolute;inset:0;background:rgba(36,59,90,0.72)"></div>
        <div data-overlay-surface style="position:relative;z-index:9001;background:#FFF9F1;color:#2b2b3a;padding:24px;border-radius:16px">
          <button data-overlay-close aria-label="Continue your journey" onclick="this.closest('[data-overlay-root]').remove()">✕</button>
          <p>+30 Gold</p>
        </div>
      </div>`)
    );
    await page.goto('http://localhost/fixture');
    const dismissed = await clearRewardModals(page, { expect });
    // The overlay's ✕ (aria-label "Continue your journey") was dismissed FIRST,
    // not the covered page button, and the drain then cleared the now-uncovered
    // page "Close" ✕. Both recorded by accessible name.
    expect(dismissed[0]).toBe('Continue your journey');
    expect(dismissed).toContain('Close');
  });
});
