import type { CheckoutMode } from './checkoutPresentation'

export type CheckoutMethod = 'telegram_stars' | 'card_to_card' | 'wallet'

/** An explicit choice survives async prices; removed methods never remain selected. */
export function selectedPaymentMethod(choice: CheckoutMethod | null, mode: CheckoutMode, available: CheckoutMethod[]): CheckoutMethod | null {
  if (choice && available.includes(choice)) return choice
  if (available.length === 1) return available[0]
  if (mode === 'both') return null
  const preferred = mode === 'toman_first' ? 'card_to_card' : 'telegram_stars'
  return available.includes(preferred) ? preferred : available[0] ?? null
}
