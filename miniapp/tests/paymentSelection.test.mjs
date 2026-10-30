import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectedPaymentMethod } from '../src/features/commerce/paymentSelection.ts'
import { readFileSync } from 'node:fs'
const all = ['telegram_stars', 'card_to_card', 'wallet']
test('each admin presentation chooses its intended default without conflating wallet and Telegram', () => {
  assert.equal(selectedPaymentMethod(null, 'stars_first', all), 'telegram_stars')
  assert.equal(selectedPaymentMethod(null, 'toman_first', all), 'card_to_card')
  assert.equal(selectedPaymentMethod(null, 'both', all), null)
  assert.equal(selectedPaymentMethod(null, 'both', ['wallet']), 'wallet')
  assert.equal(selectedPaymentMethod(null, 'both', []), null)
})
test('an explicit choice survives price loading and unavailable methods cannot remain active', () => {
  assert.equal(selectedPaymentMethod('wallet', 'toman_first', all), 'wallet')
  assert.equal(selectedPaymentMethod('telegram_stars', 'both', all), 'telegram_stars')
  assert.equal(selectedPaymentMethod('card_to_card', 'stars_first', ['telegram_stars','wallet']), 'telegram_stars')
  assert.equal(selectedPaymentMethod('card_to_card', 'both', ['telegram_stars','wallet']), null)
  for (const mode of ['both','stars_first','toman_first']) {
    assert.equal(selectedPaymentMethod('telegram_stars', mode, ['card_to_card']), 'card_to_card')
    assert.equal(selectedPaymentMethod('wallet', mode, []), null)
  }
})
test('bank checkout remains mounted when switching methods so request identity is retained', () => {
  const flow = readFileSync(new URL('../src/components/commerce/PaymentFlow.tsx', import.meta.url),'utf8')
  assert.ok(flow.includes('<div hidden={selected !== \'card_to_card\'}><ManualPurchaseButton'))
  assert.ok(flow.includes('disabled={locked}'))
  assert.ok(flow.includes('manualPriceState ?? ownPrice'))
})
test('card proof is a deliberate second step with durable submission, not a success assertion', () => {
  const file = readFileSync(new URL('../src/components/commerce/manual/ManualCheckout.tsx', import.meta.url),'utf8')
  assert.ok(file.includes("step === 'transfer'"))
  assert.ok(file.includes("setStep('proof')"))
  assert.ok(file.includes('!selectedCard'))
  assert.ok(file.includes("status: 'submitted'"))
  assert.ok(file.includes('form="manual-proof-form"'))
  assert.ok(file.includes("text('manual.unsent_warning')"))
})
test('unresolved Telegram invoices are not described as cancelled', () => {
  for (const page of ['ProductPage','ProfilePage']) {
    const file = readFileSync(new URL('../src/pages/'+page+'.tsx',import.meta.url),'utf8')
    assert.ok(file.includes("else if (status === 'cancelled')"))
    assert.ok(file.includes("text('payment.pending_message')"))
  }
})
