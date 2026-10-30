import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { manualScenarios, parseManualScenario, manualPreviewPayment } from '../src/features/content/manualPreview.ts';

test('editor includes partial and fully discounted Toman checkout', () => {
  for (const state of ['coupon','coupon-free']) {
    const value = 'manual-product-' + state;
    assert.ok(manualScenarios('product').some(item => item.value === value));
    assert.deepEqual(parseManualScenario(value), {purpose:'product',state});
    const payment = manualPreviewPayment('product',state);
    assert.equal(payment.toman + payment.discount_toman, payment.original_toman);
    assert.equal(payment.coupon_code,'WELCOME');
    assert.equal(payment.status,state === 'coupon-free' ? 'approved' : 'awaiting_proof');
  }
  assert.equal(parseManualScenario('manual-wallet_topup-coupon'),null);
});

test('manual checkout sends only its independently validated coupon and never retries a successful free claim', () => {
  const source = readFileSync(new URL('../src/components/commerce/manual/ManualPurchaseButton.tsx',import.meta.url),'utf8');
  assert.match(source,/couponQuote\?\.currency === 'toman'/);
  assert.match(source,/coupon_code: couponCode/);
  assert.match(source,/\['rejected', 'cancelled'\]\.includes/);
  assert.doesNotMatch(source,/\['approved', 'rejected'/);
  assert.match(source,/disabled \|\| busy \|\| couponBlocked/);
  assert.doesNotMatch(source, /<ProductCoupon/);
});
