import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { defaultCheckoutPresentation, parseCheckoutPresentation, effectiveCheckoutMode } from '../src/features/commerce/checkoutPresentation.ts';
test('price labels name currencies, not payment methods', () => {
  const catalog = readFileSync(new URL('../src/features/content/contentCatalog.ts', import.meta.url), 'utf8');
  assert.ok(catalog.includes("'checkout.stars_price': 'قیمت (Stars)'"));
  assert.ok(catalog.includes("'checkout.card_price': 'قیمت (تومان)'"));
  assert.ok(catalog.includes("'checkout.card_method': 'پرداخت کارت‌به‌کارت'"));
});
test('checkout defaults preserve Stars-first and parse independent choices', () => {
  for (const value of [undefined, '', 'null', '{}', 'invalid', '[]']) assert.deepEqual(parseCheckoutPresentation(value), defaultCheckoutPresentation);
  assert.deepEqual(parseCheckoutPresentation('{"product":"both","vip_plan":"toman_first","wallet_topup":"stars_first"}'), { product:'both', vip_plan:'toman_first', wallet_topup:'stars_first' });
  assert.equal(parseCheckoutPresentation('{"product":"invalid"}').product, 'stars_first');
});
test('preferred display never exposes an unavailable payment method', () => {
  for (const mode of ['both', 'stars_first', 'toman_first']) {
    assert.equal(effectiveCheckoutMode(mode, true, true), mode);
    assert.equal(effectiveCheckoutMode(mode, true, false), 'stars_first');
    assert.equal(effectiveCheckoutMode(mode, false, true), 'toman_first');
    assert.equal(effectiveCheckoutMode(mode, false, false), 'stars_first');
  }
});
test('all purchase purposes use one selected payment method and preserve currency policy', () => {
  const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');
  for (const [file,purpose] of [['catalog/ProductPurchasePanel','product'],['profile/VipPlans','vip_plan'],['profile/WalletSections','wallet_topup']]) {
    assert.ok(source('components/'+file+'.tsx').includes('<PaymentFlow'));
    assert.ok(source('components/'+file+'.tsx').includes('purpose="'+purpose+'"'));
  }
  const flow = source('components/commerce/PaymentFlow.tsx');
  assert.match(flow, /selectedPaymentMethod\(/);
  assert.match(flow, /mode === 'both' && <div className="checkout-price-comparison"/);
  assert.match(flow, /hidden={!selected}/);
  assert.match(flow, /walletAction &&/);
  assert.match(flow, /availablePrice={price}/);
  assert.match(source('features/commerce/useManualPrice.ts'), /result.available && price && Number.isSafeInteger/);
  assert.match(source('components/catalog/ProductPurchasePanel.tsx'), /manualBlocked={cardBlocked}/);
});
