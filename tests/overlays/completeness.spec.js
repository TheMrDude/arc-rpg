/**
 * The check that actually stops this recurring.
 *
 * A shell only helps overlays that use it. This walks the source for anything
 * that paints a full-viewport backdrop and fails if it is not accounted for in
 * lib/overlayRegistry.js -- so a new overlay cannot be added without a decision
 * about its priority, and the set still on the old pattern is visible in CI
 * rather than in someone's head.
 *
 * No browser. Runs in about a second, which is why it can gate every push.
 */
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {
  OVERLAY_REGISTRY, TOAST_BAND, SLATED_FOR_REMOVAL,
} = require('../../lib/overlayRegistry');

const ROOT = path.resolve(__dirname, '../..');
const SEARCH_DIRS = ['app', 'components'];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(p, out);
    } else if (/\.(js|jsx|tsx)$/.test(entry.name) && !entry.name.endsWith('.bak')) {
      out.push(p);
    }
  }
  return out;
}

/** A full-viewport backdrop, however it is expressed. */
function paintsFullScreenBackdrop(src) {
  if (/fixed inset-0/.test(src)) return true;
  if (/position:\s*['"]fixed['"]/.test(src) && /inset:\s*0/.test(src)) return true;
  return false;
}

test('every full-screen overlay in the source is registered', () => {
  const files = SEARCH_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const registered = new Set([
    ...OVERLAY_REGISTRY.map((o) => o.file),
    ...TOAST_BAND,
    ...SLATED_FOR_REMOVAL,
    // The shell itself paints the backdrop for everyone else.
    'app/components/Overlay.js',
  ]);

  const unregistered = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    if (registered.has(rel)) continue;
    if (paintsFullScreenBackdrop(fs.readFileSync(abs, 'utf8'))) unregistered.push(rel);
  }

  expect(
    unregistered,
    'These paint a full-screen overlay but are not in lib/overlayRegistry.js. ' +
      'Add each one with a priority (or to TOAST_BAND / SLATED_FOR_REMOVAL) so the ' +
      'queue and the shell tests know about it.'
  ).toEqual([]);
});

test('no component outside the shell sets a z-index in the shell band', () => {
  const files = SEARCH_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
  const offenders = [];
  for (const abs of files) {
    const rel = path.relative(ROOT, abs);
    if (rel === 'app/components/Overlay.js') continue;
    const src = fs.readFileSync(abs, 'utf8');
    const nums = [
      ...src.matchAll(/z-\[(\d+)\]/g),
      ...src.matchAll(/zIndex:\s*(\d+)/g),
    ].map((m) => Number(m[1]));
    const tooHigh = nums.filter((n) => n >= 9000);
    if (tooHigh.length) offenders.push(`${rel}: ${tooHigh.join(', ')}`);
  }
  expect(
    offenders,
    'The shell owns z-index 9000+. Nothing else may enter that band.'
  ).toEqual([]);
});

test('registry entries point at files that exist and have unique ids', () => {
  const ids = new Set();
  for (const o of OVERLAY_REGISTRY) {
    expect(fs.existsSync(path.join(ROOT, o.file)), `${o.file} is missing`).toBe(true);
    expect(ids.has(o.id), `duplicate overlay id ${o.id}`).toBe(false);
    ids.add(o.id);
    expect(typeof o.priority, `${o.id} has no priority`).toBe('number');
  }
});

test('migration progress is reported', () => {
  const total = OVERLAY_REGISTRY.length;
  const done = OVERLAY_REGISTRY.filter((o) => o.migrated).length;
  const left = OVERLAY_REGISTRY.filter((o) => !o.migrated).map((o) => o.id);
  console.log(`overlay migration: ${done}/${total} on the shell`);
  if (left.length) console.log(`still on the old pattern (${left.length}): ${left.join(', ')}`);
  // Not an assertion yet: phase 1 deliberately migrates nothing. Phase 3 flips
  // this to expect(left).toEqual([]).
  expect(total).toBeGreaterThan(0);
});
