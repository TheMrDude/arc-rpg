/**
 * Shell invariants, at Fire tablet size.
 *
 * Every assertion here corresponds to a bug a nine-year-old actually hit:
 * a close button below the fold with no way to scroll to it, no Escape handler,
 * a scroll lock that leaked when two overlays overlapped, and text the same
 * colour as its background. Measured, never eyeballed.
 */
const { test, expect } = require('@playwright/test');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HARNESS = path.join(__dirname, 'harness');
const URL = `file://${path.join(HARNESS, 'index.html')}`;

test.beforeAll(() => {
  // Bundle the harness against the real components. No mocks: the thing under
  // test is the actual shell the app will use.
  execFileSync('npx', [
    'esbuild', path.join(HARNESS, 'entry.jsx'),
    '--bundle', `--outfile=${path.join(HARNESS, 'bundle.js')}`,
    '--loader:.js=jsx', '--jsx=automatic',
    '--define:process.env.NODE_ENV="development"',
    "--define:process={\"env\":{\"NODE_ENV\":\"development\"}}",
    `--alias:@=${path.resolve(__dirname, '../..')}`,
  ], { stdio: 'inherit' });

  // Real compiled CSS, so globals.css's `body { color: #FFFFFF }` is present --
  // that rule is the reason two of the bugs happened, and a harness without it
  // would prove nothing.
  const cssDir = path.resolve(__dirname, '../../.next/static/css');
  const css = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).find((f) => f.endsWith('.css')) : null;
  fs.writeFileSync(
    path.join(HARNESS, 'app.css'),
    css ? fs.readFileSync(path.join(cssDir, css)) : 'body { color: #FFFFFF; }'
  );
});

// Composite translucent ancestors to find the real painted background, and prefer
// -webkit-text-fill-color, which beats `color` when both are set.
const CONTRAST = `
function __parse(s){if(!s)return null;let m=s.match(/rgba?\\(([^)]+)\\)/);
 if(m){const p=m[1].split(',').map(x=>parseFloat(x.trim()));return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
 m=s.match(/color\\(srgb\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)(?:\\s*\\/\\s*([\\d.]+))?\\)/);
 if(m)return{r:+m[1]*255,g:+m[2]*255,b:+m[3]*255,a:m[4]!==undefined?+m[4]:1};return null;}
function __over(f,b){return{r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1};}
function __lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
 return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
function __ratio(el){const cs=getComputedStyle(el);const stack=[];
 for(let n=el;n;n=n.parentElement){const c=__parse(getComputedStyle(n).backgroundColor);
  if(c&&c.a>0){stack.push(c);if(c.a===1)break;}}
 let bg={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)bg=__over(stack[i],bg);
 const fill=cs.webkitTextFillColor;let fg=__parse(fill&&fill!==cs.color?fill:cs.color);
 if(!fg)return null;if(fg.a<1)fg=__over(fg,bg);
 const [hi,lo]=[__lum(fg),__lum(bg)].sort((a,b)=>b-a);return (hi+0.05)/(lo+0.05);}
window.__textContrasts=function(){
 const root=document.querySelector('[data-overlay-surface]');if(!root)return [];
 const out=[];const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let n;while((n=walk.nextNode())){const t=n.textContent.trim();if(!t)continue;
  const el=n.parentElement;if(!el||!el.offsetParent&&el!==root)continue;
  const r=__ratio(el);if(r!=null)out.push({text:t.slice(0,40),ratio:+r.toFixed(2)});}
 return out;};
`;

async function harness(page) {
  await page.goto(URL);
  await page.addScriptTag({ content: CONTRAST });
  await page.waitForTimeout(300);
}

test.describe('overlay shell', () => {
  test.use({ viewport: { width: 600, height: 960 } });

  test('close control is visible without scrolling, and 44px', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => window.__open('solo'));
    const close = page.locator('[data-overlay-close]');
    await expect(close).toBeVisible();
    // A geometry assertion must not race the open animation. Mid-flight the
    // surface sits at scale(0.98), which measured this 44px button at 43.43px --
    // a real-looking failure with no real cause. Wait for the transform to
    // settle rather than trusting motion emulation to have disabled it.
    await page.waitForFunction(() => {
      const s = document.querySelector('[data-overlay-surface]');
      return s && getComputedStyle(s).transform === 'none';
    }, null, { timeout: 5000 });
    const box = await close.boundingBox();
    expect(box.width, 'close width').toBeGreaterThanOrEqual(44);
    expect(box.height, 'close height').toBeGreaterThanOrEqual(44);
    expect(box.y, 'close is below the top of the viewport').toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, 'close is above the fold').toBeLessThanOrEqual(960);
  });

  test('Escape closes, on its own', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => window.__open('solo'));
    await expect(page.locator('[data-overlay-surface]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-overlay-surface]')).toHaveCount(0);
  });

  test('backdrop tap closes, on its own', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => window.__open('solo'));
    await page.locator('[data-overlay-backdrop]').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('[data-overlay-surface]')).toHaveCount(0);
  });

  test('the close button closes, on its own', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => window.__open('solo'));
    await page.locator('[data-overlay-close]').click();
    await expect(page.locator('[data-overlay-surface]')).toHaveCount(0);
  });

  test('body scroll is locked while open and restored after close', async ({ page }) => {
    await harness(page);
    const before = await page.evaluate(() => getComputedStyle(document.body).overflow);
    await page.evaluate(() => window.__open('solo'));
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe(before);
    expect(await page.evaluate(() => window.__lockDepth())).toBe(0);
  });

  test('nested overlays do not leak the lock', async ({ page }) => {
    await harness(page);
    // Two shells open at once is not how the queue behaves, but the lock must be
    // correct anyway -- the old code restored to '' and unlocked the page while
    // the outer overlay was still up.
    await page.evaluate(() => { window.__open('solo'); window.__open('user'); });
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__lockDepth())).toBeGreaterThanOrEqual(2);
    await page.evaluate(() => window.__close('user'));
    await page.waitForTimeout(200);
    expect(
      await page.evaluate(() => getComputedStyle(document.body).overflow),
      'still locked while the outer overlay is open'
    ).toBe('hidden');
    await page.evaluate(() => window.__close('solo'));
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__lockDepth())).toBe(0);
  });

  test('tall content scrolls INSIDE the overlay and the close button does not move', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => { window.__setTall(true); window.__open('solo'); });
    await page.waitForTimeout(250);
    const before = await page.locator('[data-overlay-close]').boundingBox();
    const body = page.locator('[data-overlay-body]');
    const scrollable = await body.evaluate((el) => el.scrollHeight > el.clientHeight + 4);
    expect(scrollable, 'overlay body is internally scrollable').toBe(true);
    await body.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(200);
    expect(await body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const after = await page.locator('[data-overlay-close]').boundingBox();
    expect(Math.abs(after.y - before.y), 'close button stayed put').toBeLessThan(2);
    await expect(page.locator('[data-overlay-close]')).toBeVisible();
  });

  for (const tone of ['light', 'dark']) {
    test(`all text is at least 4.5:1 (${tone} tone)`, async ({ page }) => {
      await harness(page);
      await page.evaluate((t) => { window.__setTone(t); window.__open('solo'); }, tone);
      await page.waitForTimeout(300);
      const measured = await page.evaluate(() => window.__textContrasts());
      expect(measured.length, 'found text to measure').toBeGreaterThan(0);
      const bad = measured.filter((m) => m.ratio < 4.5);
      expect(bad, `low-contrast text: ${JSON.stringify(bad)}`).toEqual([]);
    });
  }

  test('the contrast detector catches a raw Tailwind text utility in the portal', async ({ page }) => {
    await harness(page);
    // text-navy/60 is exactly what DiceRoll used. Inside the portal on a dark
    // surface it is invisible; the point of this test is that the measurement
    // NOTICES, so a green run above means something.
    await page.evaluate(() => { window.__showHazard = true; window.__setTone('dark'); window.__open('solo'); });
    await page.waitForTimeout(300);
    const measured = await page.evaluate(() => window.__textContrasts());
    const hazard = measured.find((m) => m.text.startsWith('Hazardous'));
    expect(hazard, 'hazard line was measured').toBeTruthy();
    expect(hazard.ratio, `text-navy/60 on the dark surface measured ${hazard?.ratio}`).toBeLessThan(4.5);
  });

  test('only the highest-priority overlay is in the DOM', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => {
      window.__open('ask');
      window.__open('narrative');
      window.__open('reward');
    });
    await page.waitForTimeout(250);
    expect(await page.locator('[data-overlay-surface]').count(), 'exactly one visible').toBe(1);
    expect((await page.evaluate(() => window.__queue())).holder).toBe('reward');

    // A reward outranks a story beat. This is the live bug: a narrative card and
    // a reflection prompt were both up after one quest completion.
    await page.evaluate(() => window.__open('user'));
    await page.waitForTimeout(250);
    expect(await page.locator('[data-overlay-surface]').count()).toBe(1);
    expect((await page.evaluate(() => window.__queue())).holder).toBe('user');

    // And the ones that lost are still waiting, not dropped.
    const snap = await page.evaluate(() => window.__queue());
    expect(snap.snapshot.map((s) => s.id).sort()).toEqual(['ask', 'narrative', 'reward', 'user']);
  });

  test('the queue hands over in priority order as each closes', async ({ page }) => {
    await harness(page);
    await page.evaluate(() => {
      window.__open('ask'); window.__open('narrative');
      window.__open('reward'); window.__open('user');
    });
    const order = [];
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(220);
      const holder = (await page.evaluate(() => window.__queue())).holder;
      order.push(holder);
      await page.evaluate((h) => window.__close(h), holder);
    }
    expect(order).toEqual(['user', 'reward', 'narrative', 'ask']);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__lockDepth())).toBe(0);
  });
});
