/**
 * Jest cannot parse ESM. That single fact is why the deleted tests/security
 * suites never imported a line of application code: `require('../lib/premium')`
 * threw "Cannot use import statement outside a module", so every suite reached
 * for fetch() against localhost instead, and none of them ever ran a function
 * from this repo.
 *
 * esbuild is already a devDependency, so this is the whole fix -- no babel, no
 * new packages. Without it, "wire the surviving unit tests into CI" has nothing
 * to wire.
 */
const { transformSync } = require('esbuild');

module.exports = {
  process(source, filename) {
    const loader = filename.endsWith('.tsx')
      ? 'tsx'
      : filename.endsWith('.ts')
        ? 'ts'
        : filename.endsWith('.jsx')
          ? 'jsx'
          : 'js';

    const result = transformSync(source, {
      loader,
      // CJS so Jest's module registry can consume it.
      format: 'cjs',
      target: 'node22',
      sourcemap: 'inline',
      sourcefile: filename,
    });

    return { code: result.code };
  },
};
