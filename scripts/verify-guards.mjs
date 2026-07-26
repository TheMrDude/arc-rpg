#!/usr/bin/env node
/**
 * Fails the build if a guard is not actually guarding.
 *
 * This exists because .eslintrc.json was invalid for two days. A "comment" key
 * inside the overrides entry made the whole config fail to load, so no-undef
 * never ran -- and the only reason anyone noticed is that the bug it was added
 * to catch got recreated by hand. A misconfigured linter is worse than no
 * linter, because it reports success.
 *
 * The standard here is deliberately not "the config parses". It is "the rule
 * fires on code that should trip it". Every check below proves a guard can FAIL,
 * rather than asserting that it works.
 */
import { ESLint } from 'eslint';

const problems = [];
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { problems.push(m); console.error(`  FAIL  ${m}`); };

console.log('verify-guards: ESLint');

// 1. The config must LOAD. An invalid property anywhere makes ESLint throw here,
//    which is exactly the failure that went unnoticed.
let eslint;
try {
  eslint = new ESLint({ errorOnUnmatchedPattern: false });
  await eslint.calculateConfigForFile('app/page.js');
  ok('config loads');
} catch (err) {
  bad(`config is INVALID and no rule is running: ${err.message.split('\n')[0]}`);
  console.error('\nverify-guards FAILED\n');
  process.exit(1);
}

// 2. no-undef must be switched on for JS. Reading the resolved config catches a
//    scoping mistake (wrong glob, override shadowed) that a parse check cannot.
const cfg = await eslint.calculateConfigForFile('app/page.js');
const level = cfg.rules?.['no-undef']?.[0];
if (level === 'error' || level === 2) ok('no-undef is set to error for .js');
else bad(`no-undef is "${level}" for .js, expected error`);

// 3. And it must actually FIRE. This is the check that would have caught the
//    two-day outage on day one: a rule that is configured but not running looks
//    identical to a rule that is working, unless you make it fail on purpose.
const canary = 'export const x = someIdentifierThatIsNotDefinedAnywhere;\n';
const results = await eslint.lintText(canary, { filePath: 'app/__guard_canary__.js' });
const undefErrors = results.flatMap((r) => r.messages).filter((m) => m.ruleId === 'no-undef');
if (undefErrors.length > 0) ok(`no-undef fires on an undefined reference (${undefErrors.length} error)`);
else bad('no-undef did NOT fire on an undefined reference -- the rule is inert');

// 4. The env block must be present, or no-undef floods on Set/Map/Promise and
//    someone will "fix" it by turning the rule off again.
for (const g of ['Set', 'Map', 'Promise', 'document', 'process']) {
  if (cfg.env && (cfg.env.browser || cfg.env.node || cfg.env.es2022)) continue;
  bad(`env block missing, so no-undef will false-positive on ${g}`);
  break;
}
if (cfg.env?.browser && cfg.env?.node) ok('env includes browser and node, so globals do not false-positive');

if (problems.length) {
  console.error(`\nverify-guards FAILED (${problems.length}):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nA guard that cannot fail is not a guard. Fix the config, do not disable the check.\n');
  process.exit(1);
}
console.log('verify-guards: all ESLint guards proven live\n');
