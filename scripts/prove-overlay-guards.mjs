#!/usr/bin/env node
/**
 * Mutation-proves the overlay suite.
 *
 * "The tests pass" says nothing about whether they would notice a regression.
 * This breaks the shell on purpose, one fault at a time, and asserts the
 * matching test goes RED. A break that stays green is a test that is not
 * protecting anything.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';

const SHELL = 'app/components/Overlay.js';
const QUEUE = 'lib/overlayQueue.js';
const LOCK = 'lib/scrollLock.js';
const originals = Object.fromEntries([SHELL, QUEUE, LOCK].map((f) => [f, fs.readFileSync(f, 'utf8')]));
const restore = () => { for (const [f, s] of Object.entries(originals)) fs.writeFileSync(f, s); };

const MUTATIONS = [
  { name: 'Escape handler removed', file: SHELL, grep: 'Escape closes',
    from: "      if (e.key === 'Escape' || e.key === 'Esc') {", to: "      if (false) {" },
  { name: 'backdrop click removed', file: SHELL, grep: 'backdrop tap closes',
    from: "          if (e.target === e.currentTarget && dismissOnBackdrop) close();", to: "          return;" },
  { name: 'close button does nothing', file: SHELL, grep: 'the close button closes',
    from: "            onClick={close}\n            aria-label={closeLabel}", to: "            onClick={() => {}}\n            aria-label={closeLabel}" },
  { name: 'close button shrunk to 40px', file: SHELL, grep: '44px',
    from: "              width: 44,\n              height: 44,\n              minWidth: 44,\n              minHeight: 44,", to: "              width: 40,\n              height: 40," },
  { name: 'scroll lock removed', file: SHELL, grep: 'body scroll is locked',
    from: "    lockScroll();\n    return () => unlockScroll();", to: "    return undefined;" },
  { name: 'lock restores to empty string (the original bug)', file: LOCK, grep: 'nested overlays do not leak',
    from: "  depth -= 1;\n  if (depth > 0) return;", to: "  depth -= 1;" },
  { name: 'body loses minHeight:0 so the surface overflows and the header leaves', file: SHELL, grep: 'close button does not move',
    from: "            flex: '1 1 auto',\n            minHeight: 0,", to: "            flex: '1 1 auto'," },
  { name: 'max-height removed so nothing scrolls internally', file: SHELL, grep: 'tall content scrolls INSIDE',
    from: "          maxHeight: 'min(88svh, 88vh)',", to: "" },
  { name: 'body text set to the surface colour', file: SHELL, grep: 'at least 4.5:1 \\(light tone\\)',
    from: "  light: { surface: '#FFF9F1', text: '#2b2b3a',", to: "  light: { surface: '#FFF9F1', text: '#FFF9F1'," },
  { name: 'queue always grants the slot', file: QUEUE, grep: 'only the highest-priority',
    from: "  return Boolean(active) && holder === id;", to: "  return Boolean(active);" },
];

const rows = [];
for (const m of MUTATIONS) {
  restore();
  const src = fs.readFileSync(m.file, 'utf8');
  if (!src.includes(m.from)) { rows.push([m.name, 'ANCHOR MISSING', '?']); continue; }
  fs.writeFileSync(m.file, src.replace(m.from, m.to));
  let red = false, detail = '';
  try {
    execFileSync('npx', ['playwright', 'test', '--project=overlays', '--reporter=line', '-g', m.grep],
      { stdio: 'pipe', env: { ...process.env } });
    detail = 'stayed GREEN';
  } catch (e) {
    red = true;
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    const n = out.match(/(\d+) failed/);
    detail = `went RED (${n ? n[1] : '?'} failed)`;
  }
  rows.push([m.name, red ? 'DETECTED' : 'NOT DETECTED', detail]);
  console.log(`${red ? 'PASS' : 'FAIL'}  ${m.name.padEnd(48)} ${detail}`);
}
restore();

const missed = rows.filter((r) => r[1] !== 'DETECTED');
console.log(`\n${rows.length - missed.length}/${rows.length} deliberate breaks were detected`);
if (missed.length) {
  console.log('\nNOT DETECTED — these assertions are not protecting anything:');
  for (const r of missed) console.log(`  - ${r[0]} (${r[2]})`);
  process.exit(1);
}
console.log('every overlay assertion is proven able to fail.\n');
