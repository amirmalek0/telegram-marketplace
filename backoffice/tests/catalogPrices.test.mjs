import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: `import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { CatalogPrices } from './src/components/catalog/CatalogPrices';
      export const render = props => renderToStaticMarkup(React.createElement(CatalogPrices, props));`,
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external',
  tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
});
// Keep package imports resolvable from this test rather than a data URL.
const source = new TextDecoder().decode(result.outputFiles[0].contents);
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const bundled = source.replace(/from "([^"]+)"/g, (_, specifier) => `from ${JSON.stringify(new URL('file://' + require.resolve(specifier)).href)}`);
const { render } = await import('data:text/javascript;base64,' + Buffer.from(bundled).toString('base64'));

test('catalog prices show independent Stars and Toman amounts with a star icon', () => {
  const html = render({ stars: 25, toman: 125000 });
  assert.match(html, /Stars/);
  assert.match(html, /تومان/);
  assert.ok(html.includes((25).toLocaleString('fa-IR')));
  assert.ok(html.includes((125000).toLocaleString('fa-IR')));
  assert.match(html, /<svg/);
});

test('unset Toman prices do not advertise a free purchase and incomplete drafts never show NaN', () => {
  for (const toman of [0, undefined, NaN, -1]) {
    const html = render({ stars: NaN, toman });
    assert.match(html, /ارائه نمی‌شود/);
    assert.match(html, /تنظیم نشده/);
    assert.doesNotMatch(html, /NaN|ناعدد/);
  }
});

test('all catalog lists and editor previews use both prices', () => {
  for (const path of ['products/ProductsPage', 'products/ProductPaymentSettings', 'vip/VipPage', 'vip/VipPlanModal', 'wallets/WalletsPage', 'wallets/WalletPackModal']) {
    const page = readFileSync(new URL(`../src/pages/${path}.tsx`, import.meta.url), 'utf8');
    assert.match(page, /<CatalogPrices stars=.+toman=/, path);
  }
});
