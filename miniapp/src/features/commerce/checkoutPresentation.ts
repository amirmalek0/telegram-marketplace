export const checkoutPresentationKey = 'appearance.checkout'
export type CheckoutMode = 'both' | 'stars_first' | 'toman_first'
export type CheckoutPurpose = 'product' | 'vip_plan' | 'wallet_topup'
export type CheckoutPresentation = Record<CheckoutPurpose, CheckoutMode>
export const defaultCheckoutPresentation: CheckoutPresentation = { product: 'stars_first', vip_plan: 'stars_first', wallet_topup: 'stars_first' }
export function parseCheckoutPresentation(raw?: string): CheckoutPresentation {
  try {
    const value = JSON.parse(raw || '{}')
    return Object.fromEntries(Object.entries(defaultCheckoutPresentation).map(([key, fallback]) => [key,
      ['both', 'stars_first', 'toman_first'].includes(value?.[key]) ? value[key] : fallback])) as CheckoutPresentation
  } catch { return { ...defaultCheckoutPresentation } }
}
export function effectiveCheckoutMode(mode: CheckoutMode, stars: boolean, card: boolean): CheckoutMode {
  if (!card) return 'stars_first'
  if (!stars) return 'toman_first'
  return mode
}
