import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as admin from '../src/pages/miniapp-content/shopDesigns.ts';
import * as app from '../../miniapp/src/features/content/shopDesigns.ts';

test('both clients accept all 25 independent shop design combinations', () => {
  assert.equal(admin.shopDesignsKey, app.shopDesignsKey);
  assert.deepEqual(admin.defaultShopDesigns, app.defaultShopDesigns);
  assert.deepEqual(admin.categoryDesigns, app.categoryDesigns);
  assert.deepEqual(admin.productDesigns, app.productDesigns);
  assert.equal(new Set(admin.categoryDesigns).size, 5);
  assert.equal(new Set(admin.productDesigns).size, 5);
  for (const categories of admin.categoryDesigns) for (const products of admin.productDesigns) {
    const value = { categories, products };
    for (const client of [admin, app]) {
      assert.deepEqual(client.parseShopDesigns(value), value);
      assert.deepEqual(client.parseShopDesigns(JSON.stringify(value)), value);
    }
  }
});

test('designs reject malformed, missing, unknown, extra and cross-section values', () => {
  for (const value of [null, undefined, '', '{', {}, [], { categories: 'grid' }, { categories: 'ribbon', products: 'tiles' }, { categories: 'featured', products: 'list' }, { categories: 'grid', products: 'grid', extra: true }, { categories: 1, products: 'list' }]) {
    for (const client of [admin, app]) {
      assert.equal(client.parseShopDesigns(value), null);
      if (value !== undefined) assert.equal(client.parseShopDesigns(JSON.stringify(value)), null);
    }
  }
});

test('design drafts do not mutate the source or defaults', () => {
  for (const client of [admin, app]) {
    const source = { ...client.defaultShopDesigns };
    const draft = client.parseShopDesigns(source);
    draft.categories = 'tiles';
    assert.deepEqual(source, { categories: 'ribbon', products: 'list' });
    assert.deepEqual(client.defaultShopDesigns, source);
  }
});
