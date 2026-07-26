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
  // KNOWN UNPROVEN, accepted deliberately.
  //
  // Removing minHeight:0 should make the flex body refuse to shrink, overflow the
  // surface and push the sticky header off-screen. It does not, in this harness:
  // the surface's own max-height plus overflow:hidden already bound the layout, so
  // the header stays put and the test correctly reports no movement. The
  // assertion is real and the mutation is a poor proxy for the failure it models
  // -- the trap it guards (MilestoneCelebration's unreachable button on a 600x960
  // tablet) needs content taller than the viewport AND no internal scroll region,
  // which the 'max-height removed' mutation above does cover, and detects.
  //
  // Left in, left labelled. It does not fail the run, and it is printed on every
  // run so it cannot quietly become a claim of full coverage.
  { name: 'body loses minHeight:0 so the surface overflows and the header leaves', file: SHELL, grep: 'close button does not move',
    knownUnproven: 'the surface max-height already bounds the layout, so this mutation cannot move the header; the overlapping "max-height removed" mutation covers the same trap and IS detected',
    from: "            flex: '1 1 auto',\n            minHeight: 0,", to: "            flex: '1 1 auto'," },
  { name: 'max-height removed so nothing scrolls internally', file: SHELL, grep: 'tall content scrolls INSIDE',
    from: "          maxHeight: 'min(88svh, 88vh)',", to: "" },
  { name: 'body text set to the surface colour', file: SHELL, grep: 'at least 4.5:1 \\(light tone\\)',
    from: "  light: { surface: '#FFF9F1', text: '#2b2b3a',", to: "  light: { surface: '#FFF9F1', text: '#FFF9F1'," },
  { name: 'queue always grants the slot', file: QUEUE, grep: 'only the highest-priority',
    from: "  return Boolean(active) && holder === id;", to: "  return Boolean(active);" },
];

/**
 * Run one filtered slice of the overlay project and classify the outcome.
 *
 * The classification is the whole point, and getting it wrong made this script
 * lie. The first version treated ANY non-zero exit as "the mutation was
 * detected". But Playwright exits non-zero and prints "1 failed" when it cannot
 * launch a browser at all -- so on a machine where Chromium was not where
 * Playwright expected it, every single mutation was recorded as DETECTED and the
 * script reported a confident 10/10 having never executed one assertion.
 *
 * That is precisely the hollow pass this script exists to find, in the script
 * itself. So outcomes are now three-way, and "the run never happened" is its own
 * answer rather than being folded into success.
 */
function runSlice(grep) {
  const INFRA = [
    /Executable doesn't exist/i,
    /browserType\.launch/i,
    /Please run the following command to download new browsers/i,
    /Cannot find module/i,
    /No tests found/i,
    /error: No tests found/i,
  ];
  try {
    const out = execFileSync(
      'npx',
      ['playwright', 'test', '--project=overlays', '--reporter=line', '-g', grep],
      { stdio: 'pipe', env: { ...process.env } }
    ).toString();
    const passed = out.match(/(\d+) passed/);
    // A green run over ZERO tests is not a green run -- a bad -g pattern would
    // otherwise read as "the assertion did not notice the mutation".
    if (!passed || Number(passed[1]) === 0) {
      return { kind: 'infra', detail: 'ran but matched no tests (bad -g pattern?)' };
    }
    return { kind: 'green', detail: `stayed GREEN (${passed[1]} passed)` };
  } catch (e) {
    const out = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    if (INFRA.some((re) => re.test(out))) {
      const first = out.split('\n').find((l) => INFRA.some((re) => re.test(l))) || 'unknown';
      return { kind: 'infra', detail: `the run never happened: ${first.trim().slice(0, 100)}` };
    }
    const n = out.match(/(\d+) failed/);
    if (!n) return { kind: 'infra', detail: 'non-zero exit with no test result at all' };
    return { kind: 'red', detail: `went RED (${n[1]} failed)` };
  }
}

// Before mutating anything: the suite must be green on unmodified source. If it
// is not -- because the browser is missing, or a test is already broken -- then
// nothing below can distinguish "the mutation caused this" from "it was red
// anyway", and every result would be meaningless. Abort loudly instead.
console.log('baseline: the overlay suite must be green before anything is broken');
const baseline = runSlice('overlay shell');
if (baseline.kind !== 'green') {
  console.error(`\nBASELINE FAILED: ${baseline.detail}`);
  console.error(
    '\nRefusing to report mutation results. A mutation harness that cannot run the\n' +
      'tests would mark every break as "detected" and print a perfect score having\n' +
      'proven nothing. If Chromium is installed somewhere non-standard, set\n' +
      'PW_CHROMIUM_PATH.\n'
  );
  process.exit(2);
}
console.log(`baseline ok: ${baseline.detail}\n`);

const rows = [];
for (const m of MUTATIONS) {
  restore();
  const src = fs.readFileSync(m.file, 'utf8');
  if (!src.includes(m.from)) { rows.push([m.name, 'ANCHOR MISSING', 'the mutation no longer applies to this source']); continue; }
  fs.writeFileSync(m.file, src.replace(m.from, m.to));

  const { kind, detail } = runSlice(m.grep);
  restore();

  let status = kind === 'red' ? 'DETECTED' : kind === 'green' ? 'NOT DETECTED' : 'INCONCLUSIVE';
  // A mutation marked knownUnproven is expected to stay green. If it ever goes
  // RED the label is stale and should be removed -- so say so rather than
  // silently upgrading it.
  if (m.knownUnproven && kind === 'green') status = 'KNOWN UNPROVEN';
  if (m.knownUnproven && kind === 'red') status = 'DETECTED (label now stale -- remove knownUnproven)';
  rows.push([m.name, status, detail, m.knownUnproven]);
  const tag = status === 'DETECTED' ? 'PASS' : status === 'KNOWN UNPROVEN' ? 'KNOWN' : kind === 'green' ? 'FAIL' : '????';
  console.log(`${tag}  ${m.name.padEnd(48)} ${detail}`);
}
restore();

const detected = rows.filter((r) => r[1].startsWith('DETECTED'));
const known = rows.filter((r) => r[1] === 'KNOWN UNPROVEN');
const notDetected = rows.filter((r) => r[1] === 'NOT DETECTED');
const inconclusive = rows.filter(
  (r) => !r[1].startsWith('DETECTED') && r[1] !== 'NOT DETECTED' && r[1] !== 'KNOWN UNPROVEN'
);

console.log(
  `\n${detected.length}/${rows.length} deliberate breaks were detected` +
    (known.length ? `, ${known.length} accepted as unproven` : '')
);

if (known.length) {
  // Printed every single run. The point of accepting an unproven assertion is
  // that it stays visible, not that it stops being mentioned.
  console.log('\nKNOWN UNPROVEN -- the assertion is kept, but this break does not exercise it:');
  for (const r of known) console.log(`  - ${r[0]}\n      ${r[3]}`);
}

if (notDetected.length) {
  console.log('\nNOT DETECTED -- these assertions are not protecting anything:');
  for (const r of notDetected) console.log(`  - ${r[0]} (${r[2]})`);
}
if (inconclusive.length) {
  // Never counted as success. An inconclusive result is the state this script
  // used to silently report as a pass.
  console.log('\nINCONCLUSIVE -- proven neither way, do NOT read these as passing:');
  for (const r of inconclusive) console.log(`  - ${r[0]}: ${r[2]}`);
}
if (notDetected.length || inconclusive.length) process.exit(1);

console.log(
  known.length
    ? `${detected.length} of ${rows.length} assertions are proven able to fail; ` +
      `${known.length} is kept but unproven (above).\n`
    : 'every overlay assertion is proven able to fail.\n'
);
