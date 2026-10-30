import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { manualScenarios, parseManualScenario, manualPreviewPayment, previewPaymentMethods } from '../src/features/content/manualPreview.ts';
import { manualContent } from '../src/features/content/manualContent.ts';
import { editorOrders, editorDeliveries } from '../src/features/content/editorFixtures.ts';
const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('all card-to-card purposes expose safe, distinct checkout states', () => {
  for (const purpose of ['product', 'vip_plan', 'wallet_topup']) {
    const options = manualScenarios(purpose);
    assert.equal(new Set(options.map(item => item.value)).size, options.length);
    for (const option of options) {
      const spec = parseManualScenario(option.value);
      assert.equal(spec.purpose, purpose);
      const payment = manualPreviewPayment(purpose, spec.state);
      assert.ok(payment.id.startsWith('preview-'));
      assert.equal(payment.cards[0].number, '0000000000000000');
      assert.equal(payment.purpose, purpose);
      assert.ok(manualContent['manual.' + payment.status]);
      if (spec.state === 'test-approved') { assert.equal(payment.status, 'approved'); assert.equal(payment.is_test, true); }
    }
  }
  assert.equal(parseManualScenario('manual-product-upgrade'), null);
  assert.equal(parseManualScenario('untrusted-state'), null);
  assert.equal(manualPreviewPayment('vip_plan', 'upgrade').credit_toman, 50000);
  assert.equal(manualPreviewPayment('wallet_topup').wallet_stars, 100);
});

test('preview methods cover both, single-method and disabled policies', () => {
  assert.deepEqual(previewPaymentMethods('content'), {telegram_stars:true, card_to_card:true});
  assert.deepEqual(previewPaymentMethods('methods-card-only'), {telegram_stars:false, card_to_card:true});
  assert.deepEqual(previewPaymentMethods('methods-stars-only'), {telegram_stars:true, card_to_card:false});
  assert.deepEqual(previewPaymentMethods('methods-disabled'), {telegram_stars:false, card_to_card:false});
});

test('previews never pass user credentials to source pages; manual operations are local', () => {
  assert.match(source('components/editor/SectionSources.tsx'), /initDataRaw: env.preview \? null/);
  const checkout = source('components/commerce/manual/ManualCheckout.tsx');
  assert.match(checkout, /if \(isPreview \|\| payment.status !== 'submitted'\) return/);
  assert.match(checkout, /if \(isPreview\) \{ setPayment\(\{ \.\.\.payment, status: 'submitted'/);
  assert.match(checkout, /if \(isPreview\) \{ setPayment\(\{ \.\.\.payment, status: 'cancelled'/);
  assert.match(source('components/commerce/manual/ManualPurchaseButton.tsx'), /if \(editorMode\) \{ setPayment\(manualPreviewPayment\(purpose\)\); return \}/);
});

test('dialog text stays in the editable root and editor remains above checkout', () => {
  assert.match(source('features/content/ContentProvider.tsx'), /id="miniapp-dialog-root"/);
  assert.match(source('components/commerce/manual/ManualCheckout.tsx'), /getElementById\('miniapp-dialog-root'\)/);
  assert.match(source('styles/content-editor.css'), /z-index: 2000/);
  assert.match(source('features/content/ContentProvider.tsx'), /data-content-static/);
  for (const file of ['ManualCheckout', 'ManualPurchaseButton', 'ManualHistory', 'BankCard', 'ManualPaymentSummary', 'ManualReceiptField', 'ManualPaymentResult']) {
    const keys = [...source('components/commerce/manual/' + file + '.tsx').matchAll(/text\('(manual\.[^']+)'\)/g)].map(match => match[1]);
    for (const key of keys) assert.ok(manualContent[key], key);
  }
});

test('checkout keeps submission reachable and receipt preview local and disposable', () => {
  const checkout = source('components/commerce/manual/ManualCheckout.tsx');
  assert.match(checkout, /id="manual-proof-form"/);
  assert.match(checkout, /form="manual-proof-form"/);
  assert.match(checkout, /manual-checkout-footer/);
  assert.match(checkout, /aria-busy={busy}/);
  const receipt = source('components/commerce/manual/ManualReceiptField.tsx');
  assert.match(receipt, /URL.createObjectURL\(file\)/);
  assert.match(receipt, /URL.revokeObjectURL\(url\)/);
  assert.match(receipt, /5 \* 1024 \* 1024/);
  assert.match(receipt, /'image\/png', 'image\/jpeg'/);
  assert.match(receipt, /disabled={disabled}/);
  assert.match(source('components/catalog/ProductPurchasePanel.tsx'), /<PaymentFlow purpose="product"/);
  assert.match(source('components/commerce/PaymentFlow.tsx'), /<ManualPurchaseButton purpose={purpose}/);
});

test('order and delivery fixtures include Toman, multiple files and all delivery types', () => {
  assert.ok(editorOrders([]).some(order => order.currency === 'IRR' && order.toman > 0));
  const items = editorDeliveries([]).flatMap(delivery => delivery.items);
  assert.deepEqual([...new Set(items.map(item => item.kind))].sort(), ['api','file','inventory','message']);
  assert.ok(items.filter(item => item.kind === 'file').length > 1);
});

test('editor receives refreshed dashboard credentials and can request normal session recovery', () => {
  const admin = readFileSync(new URL('../../backoffice/src/pages/miniapp-content/MiniappContentPage.tsx', import.meta.url), 'utf8');
  assert.match(admin, /useAuthStore.getState\(\).accessToken/);
  assert.match(admin, /\}, \[sendCredentials\]\)/);
  assert.match(admin, /miniapp-editor-auth-required/);
  assert.match(source('api/client.ts'), /this.bearerToken && status === 401/);
  assert.match(source('features/content/ContentProvider.tsx'), /event.source !== hostWindow/);
});
