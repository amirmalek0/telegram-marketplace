import type { CouponQuote } from './useProductCoupon'

export type CouponCurrency = 'stars' | 'toman'
// Normalize display amounts only; each quote remains explicitly bound to its currency.
export function checkedCouponQuote(quote: CouponQuote, productID: string, code: string, price: number, currency: CouponCurrency): CouponQuote | null {
  const original = currency === 'toman' ? quote.original_toman : quote.original_stars
  const discount = currency === 'toman' ? quote.discount_toman : quote.discount_stars
  const payable = currency === 'toman' ? quote.payable_toman : quote.payable_stars
  if (!quote.valid || quote.currency !== currency || quote.product_id !== productID || quote.code !== code.trim()
    || original !== price || !Number.isSafeInteger(discount) || !Number.isSafeInteger(payable)
    || discount! <= 0 || payable! < 0 || payable! + discount! !== price) return null
  return { ...quote, original_stars: original, discount_stars: discount!, payable_stars: payable! }
}
