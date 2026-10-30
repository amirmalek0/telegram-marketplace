import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { checkedCouponQuote } from '../src/features/commerce/couponQuotes.ts';

const base = { valid:true, code:'SaleCode', product_id:'product', currency:'stars', original_stars:100,discount_stars:20,payable_stars:80 };
test('one code retains separate, correctly typed currency discounts', () => {
  const stars = checkedCouponQuote(base,'product',' SaleCode ',100,'stars');
  assert.equal(stars.payable_stars,80);
  const response = {...base,currency:'toman',original_stars:0,discount_stars:0,payable_stars:0,original_toman:200000,discount_toman:50000,payable_toman:150000};
  const toman = checkedCouponQuote(response,'product','SaleCode',200000,'toman');
  assert.equal(toman.code,stars.code);
  assert.equal(toman.payable_stars,150000);
  assert.equal(toman.currency,'toman');
  assert.equal(response.payable_stars,0, 'response must not be mutated');
});
test('reject wrong currency, code, product, stale prices, and invalid arithmetic', () => {
  for (const change of [{currency:'toman'}, {code:'SALECODE'}, {product_id:'other'}, {valid:false}, {original_stars:101}, {payable_stars:81}, {payable_stars:-1}, {discount_stars:0}, {payable_stars:NaN}, {discount_stars:20.5}]) {
    assert.equal(checkedCouponQuote({...base,...change},'product','SaleCode',100,'stars'),null);
  }
  assert.equal(checkedCouponQuote({...base,currency:'toman'},'product','SaleCode',100,'toman'),null);
});
test('full discount is allowed without confusing zero with no quote', () => {
  assert.equal(checkedCouponQuote({...base,payable_stars:0,discount_stars:100},'product','SaleCode',100,'stars').payable_stars,0);
});
test('only the product page owns a single coupon field shared by both checkouts', () => {
  const source = path => readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
  assert.equal((source('pages/ProductPage.tsx').match(/<ProductCoupon /g)||[]).length,1);
  const manual = source('components/commerce/manual/ManualPurchaseButton.tsx');
  assert.doesNotMatch(manual,/useProductCoupon\(|<ProductCoupon/);
  assert.match(manual,/coupon_code: couponCode/);
  assert.match(manual,/onBusyChange\?\.\(busy \|\| Boolean\(payment\)\)/);
  const hook = source('features/commerce/useProductCoupon.ts');
  assert.match(hook,/current !== generation.current/);
  assert.match(hook,/Promise.all/);
  assert.match(hook,/tomanNeedsApply/);
  assert.match(source('components/commerce/ProductCoupon.tsx'),/text\('coupon.title'\)/);
  assert.doesNotMatch(source('components/commerce/ProductCoupon.tsx'),/coupon.toman_title|coupon.stars_title/);
});
