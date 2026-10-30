import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import * as admin from '../src/pages/miniapp-content/pageLayouts.ts';
import * as app from '../../miniapp/src/features/content/pageLayouts.ts';
import { productFactFields, showProductFact } from '../src/pages/miniapp-content/productFacts.ts';

test('product info icons round-trip independently of visibility in both clients', () => {
  for (const client of [admin, app]) {
    const layout = client.defaultPageLayout('product');
    const section = layout.sections.find(section => section.type === 'product.facts');
    section.facts = { views: false };
    section.factIcons = Object.fromEntries(Object.keys(productFactFields).map(field => [field, 'lucide:star']));
    assert.deepEqual(client.parsePageLayout(layout, 'product'), layout);
    section.factIcons = {};
    assert.deepEqual(client.parsePageLayout(layout, 'product'), layout);
    for (const icons of [null, [], true, { views: false }, { views: null }, { unknown: 'eye' }, { views: 'lucide:not-an-icon' }, { views: '<svg/>' }]) {
      section.factIcons = icons;
      assert.equal(client.parsePageLayout(layout, 'product'), null);
    }
    const shop = client.defaultPageLayout('shop');
    shop.sections[0].factIcons = { views: 'eye' };
    assert.equal(client.parsePageLayout(shop, 'shop'), null);
  }
});

test('every product info item uses its configured icon and the picker is separate from the switch label', () => {
  const page = readFileSync(new URL('../../miniapp/src/pages/ProductPage.tsx', import.meta.url), 'utf8');
  for (const field of Object.keys(productFactFields)) assert.ok(page.includes("factIcon('" + field + "'"));
  const editor = readFileSync(new URL('../src/pages/miniapp-content/ProductFactsEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /<\/label>\s*<IconPicker/);
  assert.match(editor, /delete next\[field\]/);
});

test('shared product info contract stays identical and existing layouts remain visible', () => {
  assert.equal(readFileSync(new URL('../src/pages/miniapp-content/productFacts.ts', import.meta.url), 'utf8'),
    readFileSync(new URL('../../miniapp/src/features/content/productFacts.ts', import.meta.url), 'utf8'));
  for (const field of Object.keys(productFactFields)) assert.equal(showProductFact(undefined, field), true);
});

test('all product field combinations round-trip in both clients without changing purchase controls', () => {
  const fields = Object.keys(productFactFields);
  for (let mask = 0; mask < 2 ** fields.length; mask++) {
    const layout = admin.defaultPageLayout('product');
    const facts = Object.fromEntries(fields.map((field, index) => [field, Boolean(mask & (1 << index))]));
    layout.sections.find(section => section.type === 'product.facts').facts = facts;
    for (const client of [admin, app]) {
      const parsed = client.parsePageLayout(JSON.stringify(layout), 'product');
      assert.deepEqual(parsed, layout);
      assert.equal(parsed.sections.find(section => section.type === 'product.checkout').visible, true);
      for (const field of fields) assert.equal(showProductFact(parsed.sections.find(section => section.type === 'product.facts').facts, field), facts[field]);
    }
  }
});

test('unknown fields, invalid booleans and flags on other widgets are rejected', () => {
  for (const client of [admin, app]) {
    for (const facts of [null, [], true, {views: 'false'}, {views: null}, {file_id: false}]) {
      const layout = client.defaultPageLayout('product');
      layout.sections.find(section => section.type === 'product.facts').facts = facts;
      assert.equal(client.parsePageLayout(layout, 'product'), null);
    }
    const layout = client.defaultPageLayout('shop');
    layout.sections[0].facts = {views: false};
    assert.equal(client.parsePageLayout(layout, 'shop'), null);
  }
});
