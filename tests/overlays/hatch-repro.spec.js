const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { clearRewardModals } = require('../smoke/rewardModals');

const HARNESS = path.join(__dirname, 'harness');
const URL = `file://${path.join(HARNESS, 'hatch-index.html')}`;

test.beforeAll(() => {
  execFileSync('npx', [
    'esbuild', path.join(HARNESS, 'hatch-entry.jsx'),
    '--bundle', `--outfile=${path.join(HARNESS, 'hatch-bundle.js')}`,
    '--loader:.js=jsx', '--jsx=automatic',
    '--define:process.env.NODE_ENV="development"',
    '--define:process={"env":{"NODE_ENV":"development"}}',
    `--alias:@=${path.resolve(__dirname, '../..')}`,
  ], { stdio: 'inherit' });
  fs.writeFileSync(
    path.join(HARNESS, 'hatch-index.html'),
    `<!doctype html><html><head><link rel="stylesheet" href="app.css"></head><body style="margin:0"><div id="root"></div><script src="hatch-bundle.js"></script></body></html>`
  );
  const cssDir = path.resolve(__dirname, '../../.next/static/css');
  const css = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).find((f) => f.endsWith('.css')) : null;
  fs.writeFileSync(
    path.join(HARNESS, 'app.css'),
    css ? fs.readFileSync(path.join(cssDir, css)) : 'body { color: #FFFFFF; }'
  );
});

test.describe('hatch after reward chain', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  // Each combo is one quest's reward mix; the last quest hatches. If a reward
  // flag sticks true, the companion dialog never opens.
  for (const combo of [
    { name: 'levelUp+encounter, no reflection', opts: { levelUp: true, encounter: true } },
    { name: 'levelUp+encounter+reflection', opts: { levelUp: true, encounter: true, reflection: true } },
    { name: 'encounter only', opts: { encounter: true } },
    { name: 'levelUp only', opts: { levelUp: true } },
    { name: 'reflection only', opts: { reflection: true } },
  ]) {
    test(`3x [${combo.name}] then hatch`, async ({ page }) => {
      await page.goto(URL);
      for (let q = 1; q <= 3; q++) {
        await page.evaluate((o) => window.__completeQuest(o), combo.opts);
        await clearRewardModals(page, { expect });
      }
      // After the third quest the hatch must open.
      const state = await page.evaluate(() => window.__state());
      const dialog = page.getByRole('dialog');
      await expect(dialog, `gate state: ${JSON.stringify(state)}`).toBeVisible({ timeout: 8000 });
      console.log(`[${combo.name}] hatched. state=${JSON.stringify(state)}`);
    });
  }
});
