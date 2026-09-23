import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import * as esm from 'react-cmp-selector';

const require = createRequire(import.meta.url);
// React DOM 17 predates extensionless native ESM subpath exports.
const { renderToStaticMarkup } = require('react-dom/server');
const cjs = require('react-cmp-selector');
for (const api of [esm, cjs]) {
  const child = createElement('h1', { 'data-slot': 'header' }, 'Hello');
  assert.equal(api.getCmpByAttr({ children: child, value: 'header' }), child);
  assert.equal(
    renderToStaticMarkup(
      createElement(api.Slot, { name: 'header', children: child }),
    ),
    '<h1 data-slot="header">Hello</h1>',
  );
}
// Simulate a browser bundle with NODE_ENV replaced and no process global.
const browserModule = { exports: {} };
const browserLogs = [];
const productionSource = readFileSync(
  new URL('../dist/index.cjs', import.meta.url),
  'utf8',
).replaceAll('process.env.NODE_ENV', JSON.stringify('production'));
runInNewContext(productionSource, {
  module: browserModule,
  require,
  console: {
    debug: (...args) => browserLogs.push(args),
    warn: (...args) => browserLogs.push(args),
  },
});
browserModule.exports.getCmpByAttr({ children: null, debug: true });
assert.equal(
  browserModule.exports.SlotUtils.validate(null, ['header']).length,
  1,
);
assert.deepEqual(
  browserLogs,
  [],
  'Production browser bundles must not emit diagnostics',
);
// Marker metadata works across ESM and CommonJS imports in one application.
const Header = esm.SlotUtils.createMarker('header');
const marker = createElement(Header, null, 'Hello');
assert.equal(cjs.getCmpByAttr({ children: marker, value: 'header' }), marker);
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:[-+].+)?$/);
for (const branch of ['import', 'require']) {
  for (const path of Object.values(pkg.exports['.'][branch])) {
    assert.ok(
      existsSync(new URL(`../${path}`, import.meta.url)),
      `Missing export: ${path}`,
    );
  }
}
execFileSync(
  process.execPath,
  [
    require.resolve('typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--skipLibCheck',
    '--module',
    'NodeNext',
    '--target',
    'ES2020',
    'scripts/fixtures/consumer.mts',
    'scripts/fixtures/consumer.cts',
  ],
  { stdio: 'inherit' },
);
const npmPath = process.env.npm_execpath;
assert.ok(npmPath, 'Run this check with npm run test:package.');
const [pack] = JSON.parse(
  execFileSync(
    process.execPath,
    [npmPath, 'pack', '--dry-run', '--ignore-scripts', '--json'],
    {
      encoding: 'utf8',
    },
  ),
);
const files = new Set(pack.files.map((file) => file.path));
for (const file of [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/index.d.cts',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
]) {
  assert.ok(files.has(file), `Missing packed file: ${file}`);
}
assert.ok(
  ![...files].some(
    (file) => file.startsWith('tests/') || file.startsWith('node_modules/'),
  ),
);
console.log(
  `ESM, CommonJS, consumer types, SSR, production browser diagnostics, cross-format markers and package contents passed (${pack.size} bytes packed).`,
);
