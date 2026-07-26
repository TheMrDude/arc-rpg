/**
 * Reproduces the production-smoke failure named by the self-diagnosing
 * clearRewardModals: after a quest completion the TomorrowQuestHook suggestion
 * card renders <button aria-label="Close">✕</button> (accessible name "Close",
 * which clearRewardModals matches), and MomentumBoost's full-screen
 * `fixed inset-0 z-40` transparent tap-catcher (pointer-events:auto) sits over
 * it. A tap meant for that Close button lands on the catcher instead:
 *
 *   Why: a tap at its centre lands on div.fixed.inset-0.z-40 [z:40, pos:fixed, pe:auto]
 *
 * So the catcher, not any reward overlay, is what traps the drain. This proves
 * the mechanism and that removing the full-screen catcher fixes it.
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
    await expect(clearRewardModals(page, { expect })).rejects.toThrow(
      /lands on div.*z:\s*40|could not\s+be clicked/
    );
  });

  test('without the full-screen catcher, the Close button drains cleanly', async ({ page }) => {
    await serve(page, page_(''));
    await page.goto('http://localhost/fixture');
    const dismissed = await clearRewardModals(page, { expect });
    expect(dismissed).toEqual(['✕']);
  });
});
