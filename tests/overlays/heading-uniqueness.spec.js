/**
 * Every migrated overlay names its dialog from its own visible heading (the
 * Overlay `labelledBy` prop) instead of the shell rendering a hidden copy of the
 * same text. This proves the dialog contains that heading exactly ONCE.
 *
 * Before this, the shell rendered a sr-only <h2>{title}</h2> for the accessible
 * name AND the component rendered a visible heading with the same words, so
 * getByText matched two and a screen reader announced it twice. The production
 * smoke's hatch step hit it as a strict-mode violation ("Your egg hatched!"
 * matched two). Runs against the REAL components, no production access.
 */
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HARNESS = path.join(__dirname, 'harness');
const URL = `file://${path.join(HARNESS, 'headings-index.html')}`;

test.beforeAll(() => {
  execFileSync('npx', [
    'esbuild', path.join(HARNESS, 'headings-entry.jsx'),
    '--bundle', `--outfile=${path.join(HARNESS, 'headings-bundle.js')}`,
    '--loader:.js=jsx', '--jsx=automatic',
    '--define:process.env.NODE_ENV="development"',
    '--define:process={"env":{"NODE_ENV":"development"}}',
    `--alias:@=${path.resolve(__dirname, '../..')}`,
  ], { stdio: 'inherit' });
  fs.writeFileSync(
    path.join(HARNESS, 'headings-index.html'),
    `<!doctype html><html><head><link rel="stylesheet" href="app.css"></head><body style="margin:0"><div id="root"></div><script src="headings-bundle.js"></script></body></html>`
  );
  const cssDir = path.resolve(__dirname, '../../.next/static/css');
  const css = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).find((f) => f.endsWith('.css')) : null;
  fs.writeFileSync(
    path.join(HARNESS, 'app.css'),
    css ? fs.readFileSync(path.join(cssDir, css)) : 'body { color: #FFFFFF; }'
  );
});

test.describe('migrated overlays name themselves without a duplicate heading', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  // name -> the heading a screen reader should hear exactly once.
  for (const { name, heading } of [
    { name: 'qcc', heading: /Quest Complete!/i },
    { name: 'reflection', heading: /Quest Complete!/i },
    { name: 'dice', heading: /Random Encounter/i },
    { name: 'companion', heading: /Your egg hatched/i },
  ]) {
    test(`${name}: its heading appears exactly once in the dialog`, async ({ page }) => {
      await page.goto(URL);
      await page.evaluate((n) => window.__show(n), name);

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 8000 });

      // Exactly one element carries the heading text -- the visible one. A second
      // (the old hidden shell title) would fail here, and would be a strict-mode
      // violation for any getByText the smoke runs against it.
      await expect(dialog.getByText(heading)).toHaveCount(1);

      // And the dialog is actually named by it: aria-labelledby resolves to an
      // element whose text is the heading, so the accessible name matches what is
      // on screen rather than a hidden copy.
      const accName = await dialog.evaluate((d) => {
        const id = d.getAttribute('aria-labelledby');
        const el = id && document.getElementById(id);
        return el ? el.textContent.trim() : null;
      });
      expect(accName, 'dialog has an accessible name from a real element').toBeTruthy();
      expect(accName).toMatch(heading);
    });
  }
});
