import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeProductSearch, searchProducts } from '../src/features/catalog/search.ts';

test('normalizes Persian/Arabic letters, diacritics, whitespace and English case', () => {
  assert.equal(normalizeProductSearch('  كِيف\u200cپول  VIP '), 'کیف پول vip');
  const products = [{id:'1',title:'کیف پول',description:'VIP برای شما'}, {id:'2',title:'قالب فروشگاه',description:'وردپرس'}];
  assert.deepEqual(searchProducts(products,'vip كيف').map(item => item.id),['1']);
  assert.deepEqual(searchProducts(products,'وردپرس').map(item => item.id),['2']);
  assert.deepEqual(searchProducts(products,'ناموجود'),[]);
  assert.deepEqual(searchProducts(products,'   '),[]);
});
test('only matches product content, returns bounded results, and never mutates catalog', () => {
  const products = Array.from({length:20},(_,i)=>({id:String(i),title:'محصول',description:'توضیح',category_id:'hidden-category'}));
  assert.equal(searchProducts(products,'محصول').length,8);
  assert.equal(searchProducts(products,'hidden-category').length,0);
  assert.equal(products.length,20);
});
