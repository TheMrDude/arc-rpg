/**
 * Proof that hollow pass 2 is really closed.
 *
 * clearRewardModals in the production smoke test used to be
 * `.click().catch(() => {})` in a loop. An overlay whose dismiss button was
 * present but genuinely unclickable -- covered by a higher layer, pointer-events
 * disabled, scrolled out of reach: every overlay bug that reached a nine-year-old
 * -- was swallowed up to eight times, and the helper returned as though it had
 * cleared the screen.
 *
 * These tests serve fixtures that reproduce each of those states and assert the
 * helper now goes red. No production access needed, so this runs on every push
 * alongside the other overlay invariants.
 *
 * The fixtures deliberately reproduce the exact trap rather than a synthetic one:
 * a real dismiss button, visible and named, that a child could not press.
 */
const { test, expect } = require('@playwright/test');
const { clearRewardModals } = require('../smoke/rewardModals');

const page_ = (bodyHtml) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { margin: 0; font-family: system-ui; }
  .layer { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
  .card { background: #FFF9F1; color: #2b2b3a; padding: 24px; border-radius: 16px; }
  button { min-width: 44px; min-height: 44px; font-size: 16px; }
</style></head><body>
<main style="padding:24px">
  <label>Task <input placeholder="Enter your task..." /></label>
</main>
${bodyHtml}
</body></html>`;

const serve = (page, html) =>
  page.route('**/fixture', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: html })
  );

test.describe('clearRewardModals', () => {
  test('a dismissable reward modal is cleared and reported', async ({ page }) => {
    // The positive case. Without this, the tests below would pass just as well
    // if the helper threw unconditionally.
    await serve(
      page,
      page_(`
      <div class="layer" id="m" style="background:rgba(36,59,90,.72); z-index:9000">
        <div class="card">
          <p>+30 Gold</p>
          <button onclick="document.getElementById('m').remove()">Continue</button>
        </div>
      </div>`)
    );
    await page.goto('http://localhost/fixture');

    const dismissed = await clearRewardModals(page, { expect });
    expect(dismissed).toEqual(['Continue']);
    await expect(page.getByPlaceholder('Enter your task...')).toBeVisible();
  });

  test('two stacked reward modals are both cleared', async ({ page }) => {
    // The real reward chain: a celebration, then a chest drop behind it.
    await serve(
      page,
      page_(`
      <div class="layer" id="a" style="background:rgba(36,59,90,.72); z-index:9000">
        <div class="card"><p>Level up!</p>
          <button onclick="document.getElementById('a').remove()">Continue</button></div>
      </div>
      <div class="layer" id="b" style="background:rgba(36,59,90,.72); z-index:8999">
        <div class="card"><p>Chest!</p>
          <button onclick="document.getElementById('b').remove()">Claim</button></div>
      </div>`)
    );
    await page.goto('http://localhost/fixture');
    const dismissed = await clearRewardModals(page, { expect });
    expect(dismissed.length).toBe(2);
  });

  test('FAILS when the dismiss button is covered by a higher layer', async ({ page }) => {
    // The DiceRoll / MomentumBoost trap: the button is visible and named, and
    // an invisible layer above it eats the pointer. This is what used to be
    // caught eight times and then reported as cleared.
    await serve(
      page,
      page_(`
      <div class="layer" style="background:rgba(36,59,90,.72); z-index:9000">
        <div class="card"><p>+30 Gold</p><button>Continue</button></div>
      </div>
      <div class="layer" style="background:transparent; z-index:9500"></div>`)
    );
    await page.goto('http://localhost/fixture');

    await expect(clearRewardModals(page, { expect })).rejects.toThrow(
      /could not\s+be clicked|A child would be stuck here/
    );
  });

  test('FAILS when the dismiss button has pointer-events: none', async ({ page }) => {
    await serve(
      page,
      page_(`
      <div class="layer" style="background:rgba(36,59,90,.72); z-index:9000">
        <div class="card"><p>+30 Gold</p>
          <button style="pointer-events:none">Continue</button></div>
      </div>`)
    );
    await page.goto('http://localhost/fixture');
    await expect(clearRewardModals(page, { expect })).rejects.toThrow();
  });

  test('FAILS when a modal has no recognised dismiss control at all', async ({ page }) => {
    // The loop finds nothing to click and exits immediately. Under the old
    // helper that was indistinguishable from success. The positive exit
    // assertion -- is the dashboard actually reachable? -- is what catches it.
    await serve(
      page,
      page_(`
      <div class="layer" style="background:rgba(36,59,90,.72); z-index:9000">
        <div class="card"><p>Reflect on your day</p>
          <button>Rate my mood</button></div>
      </div>`)
    );
    await page.goto('http://localhost/fixture');
    await expect(clearRewardModals(page, { expect })).rejects.toThrow(
      /still blocked.*would land on/is
    );
  });

  test('a clear screen with no modals at all is fine', async ({ page }) => {
    await serve(page, page_(''));
    await page.goto('http://localhost/fixture');
    await expect(clearRewardModals(page, { expect })).resolves.toEqual([]);
  });
});
