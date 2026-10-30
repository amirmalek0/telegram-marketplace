import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/pageLayouts.ts';
import * as app from '../../miniapp/src/features/content/pageLayouts.ts';
import { newImageWidget, imageNumberRules, imageEnumRules } from '../src/pages/miniapp-content/imageWidgets.ts';

test('image contract remains identical in both frontends', () => {
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/imageWidgets.ts', import.meta.url), 'utf8'), readFileSync(new URL('../../miniapp/src/features/content/imageWidgets.ts', import.meta.url), 'utf8'));
});
test('images can be added independently on every page without removing required controls', () => {
  const one = newImageWidget(), two = newImageWidget();
  assert.notEqual(one.id, two.id);
  for (const client of [admin, app]) for (const page of client.pageIds) {
    const layout = client.defaultPageLayout(page);
    layout.sections.unshift(one, two);
    const parsed = client.parsePageLayout(layout, page);
    assert.deepEqual(parsed, layout);
    parsed.sections[0].image.alt = 'independent';
    assert.equal(one.image.alt, ''); assert.equal(parsed.sections[1].image.alt, '');
    assert.equal(client.parsePageLayout({ ...layout, sections: [one, one] }, page), null);
  }
});
test('image bounds, styles, URLs and CSS are strictly validated', () => {
  for (const client of [admin, app]) {
    const item = newImageWidget();
    const valid = image => client.parsePageLayout({ version: 1, sections: [{ ...item, image: { ...item.image, ...image } }] }, 'shop') !== null;
    for (const [key, [min, max]] of Object.entries(imageNumberRules)) {
      assert.ok(valid({ styles: { [key]: min } }), key); assert.ok(valid({ styles: { [key]: max } }), key);
      for (const value of [min - 1, max + 1, null, '10']) assert.equal(valid({ styles: { [key]: value } }), false, key);
    }
    for (const [key, options] of Object.entries(imageEnumRules)) {
      for (const value of options) assert.ok(valid({ styles: { [key]: value } }));
      assert.equal(valid({ styles: { [key]: 'invalid' } }), false);
    }
    assert.ok(valid({ src: '/api/v1/miniapp-images/0c0202be-f760-44ff-8e61-cfbb8e397622.png', css: '.widget { border-radius:20px; }' }));
    for (const src of ['https://example.com/a.png', '/api/v1/miniapp-images/../file', '/api/v1/miniapp-logo/0c0202be-f760-44ff-8e61-cfbb8e397622.png', 'data:image/svg+xml,test', null]) assert.equal(valid({ src }), false);
    for (const image of [{ alt: 'a'.repeat(501) }, { extra: 1 }, { css: '.widget { background:url(https://evil.test); }' }, { styles: { position: 'fixed' } }, { styles: null }]) assert.equal(valid(image), false);
  }
});
