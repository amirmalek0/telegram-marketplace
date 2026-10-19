import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/shopArrangement.ts';
import * as app from '../../miniapp/src/features/content/shopArrangement.ts';

test('shop order has the same persistence contract in both clients', () => {
  assert.equal(admin.shopArrangementKey, app.shopArrangementKey);
  assert.deepEqual(admin.defaultShopSections, app.defaultShopSections);
  for (const value of [['categories', 'products'], ['products', 'categories']]) {
    for (const client of [admin, app]) {
      assert.deepEqual(client.parseShopSections(value), value);
      assert.deepEqual(client.parseShopSections(JSON.stringify(value)), value);
    }
  }
});

test('missing, malformed, duplicate and unknown sections are rejected', () => {
  for (const value of [null, undefined, '', '{', {}, [], ['products'], ['products', 'products'], ['categories', 'profile'], ['categories', 'products', 'tickets'], [1, 2]]) {
    for (const client of [admin, app]) {
      assert.equal(client.parseShopSections(value), null);
      if (value !== undefined) assert.equal(client.parseShopSections(JSON.stringify(value)), null);
    }
  }
});

test('parsed drafts never mutate the saved input or default order', () => {
  for (const client of [admin, app]) {
    const source = [...client.defaultShopSections];
    const draft = client.parseShopSections(source);
    draft.reverse();
    assert.deepEqual(source, ['categories', 'products']);
    assert.deepEqual(client.defaultShopSections, ['categories', 'products']);
  }
});

test('legacy orders remain visible and visibility preserves original order', () => {
  for (const client of [admin, app]) {
    for (const order of [['categories', 'products'], ['products', 'categories']]) {
      assert.deepEqual(client.parseShopArrangement(order), { order, hidden: [] });
      for (const hidden of [[], ['categories'], ['products'], ['categories', 'products']]) {
        const config = { order, hidden };
        const original = structuredClone(config);
        assert.deepEqual(client.parseShopArrangement(JSON.stringify(config)), config);
        assert.deepEqual(client.parseShopSections(config), order.filter(item => !hidden.includes(item)));
        assert.deepEqual(client.parseShopSections(JSON.stringify(config)), order.filter(item => !hidden.includes(item)));
        const draft = client.parseShopArrangement(config);
        draft.order.reverse();
        draft.hidden.push('products');
        assert.deepEqual(config, original);
      }
    }
  }
});

test('visibility rejects invalid configuration without silently hiding sections', () => {
  for (const value of [
    { order: ['categories', 'products'] },
    { order: ['categories', 'products'], hidden: null },
    { order: ['categories', 'products'], hidden: true },
    { order: ['categories', 'products'], hidden: ['profile'] },
    { order: ['categories', 'products'], hidden: ['products', 'products'] },
    { order: ['categories', 'products'], hidden: [1] },
    { order: ['categories', 'products'], hidden: [], extra: true },
    { order: ['products'], hidden: [] },
  ]) for (const client of [admin, app]) {
    assert.equal(client.parseShopArrangement(value), null);
    assert.equal(client.parseShopSections(JSON.stringify(value)), null);
  }
});
