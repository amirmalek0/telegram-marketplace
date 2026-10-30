import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(new URL('../src/' + path, import.meta.url), 'utf8');

test('both method toggles live only in Payment Settings; card details stay separate', () => {
  const settings = source('pages/settings/SettingsPage.tsx');
  assert.doesNotMatch(settings, /to="\/payments\/manual"/);
  assert.doesNotMatch(settings, /PaymentMethodSettings/);
  const cards = source('pages/payments/manual/ManualCardsSettings.tsx');
  assert.doesNotMatch(cards, /PaymentMethodSettings/);
  assert.match(cards, /ManualBankCardEditor/);
  assert.match(source('pages/payments/CheckoutSettingsPage.tsx'), /<PaymentMethodSettings \/>/);
  const methods = source('pages/payments/PaymentMethodSettings.tsx');
  assert.match(methods, /checked={value.telegram_stars}/);
  assert.match(methods, /checked={value.card_to_card}/);
  assert.doesNotMatch(methods, /scope ===/);
  assert.match(methods, /put<Methods>\('\/payment\/methods', value\)/);
});

test('card configuration stays mounted between tabs and preserves drafts', () => {
  const page = source('pages/payments/manual/ManualPaymentsPage.tsx');
  assert.match(page, /hidden={tab === 'reviews'}><ManualCardsSettings/);
  const config = source('pages/payments/manual/ManualCardsSettings.tsx');
  assert.match(config, /ConfirmationModal/);
  assert.match(config, /setConfig\(saved\)/);
  assert.match(source('pages/payments/manual/manual-payments.css'), /\[hidden\]{display:none!important}/);
});

test('review refreshes state and preserves proof and approval safeguards', () => {
  const dialog = source('pages/payments/manual/ManualReviewDialog.tsx');
  assert.match(dialog, /get<ManualPayment>\(`\/payment\/manual\/reviews\//);
  assert.match(dialog, /busy \|\| loading \|\| loadError \|\| row.status !== 'submitted'/);
  assert.match(dialog, /decision === 'approve' && !confirmed/);
  assert.match(dialog, /decision === 'reject' && !note.trim\(\)/);
  assert.match(dialog, /URL.revokeObjectURL\(url\)/);
  assert.match(dialog, /onClose={\(\) => !busy && onClose\(\)}/);
});
