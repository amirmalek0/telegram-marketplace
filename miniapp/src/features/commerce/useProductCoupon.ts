import { useEffect, useRef, useState } from 'react'
import { ApiClient } from '../../api/client'
import { checkedCouponQuote, type CouponCurrency } from './couponQuotes'

export interface CouponQuote {
  valid: boolean; code: string; product_id: string
  original_stars: number; discount_stars: number; payable_stars: number
  original_toman?: number; discount_toman?: number; payable_toman?: number
  currency?: CouponCurrency; message?: string
}
type Results = { key: string; code: string; stars: CouponQuote | null; toman: CouponQuote | null; errors: Partial<Record<CouponCurrency, string>> }

export function useProductCoupon(productId: string, price: number, initDataRaw: string | null, preview: boolean, tomanPrice: number | null = null) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Results | null>(null)
  const [checking, setChecking] = useState(false)
  const generation = useRef(0)
  const key = JSON.stringify([productId, price, tomanPrice, initDataRaw, preview])
  useEffect(() => {
    generation.current++; setCode(''); setResult(null); setChecking(false)
    return () => { generation.current++ }
  }, [productId, initDataRaw, preview])
  useEffect(() => {
    generation.current++; setResult(null); setChecking(false)
    return () => { generation.current++ }
  }, [key])
  const change = (value: string) => {
    generation.current++; setCode(value); setResult(null); setChecking(false)
  }
  const apply = async () => {
    if (preview || !initDataRaw || !code.trim() || checking) return
    const current = ++generation.current, normalized = code.trim()
    setChecking(true); setResult(null)
    const next: Results = { key, code: normalized, stars: null, toman: null, errors: {} }
    const currencies: CouponCurrency[] = tomanPrice !== null ? ['stars', 'toman'] : ['stars']
    await Promise.all(currencies.map(async currency => {
      try {
        const response = await new ApiClient({ initDataRaw }).post<CouponQuote>('/coupon/validate', { product_id: productId, code: normalized, currency })
        const quote = checkedCouponQuote(response, productId, normalized, currency === 'stars' ? price : tomanPrice!, currency)
        if (quote) next[currency] = quote
        else next.errors[currency] = response.valid ? 'قیمت محصول تغییر کرده؛ صفحه را دوباره باز کنید.' : response.message || 'کد تخفیف برای این قیمت معتبر نیست.'
      } catch (reason) { next.errors[currency] = reason instanceof Error ? reason.message : 'بررسی کد تخفیف ناموفق بود.' }
    }))
    if (current !== generation.current) return
    setCode(normalized); setResult(next); setChecking(false)
  }
  const active = result?.key === key && result.code === code.trim() ? result : null
  return {
    code, quote: active?.stars ?? null, tomanQuote: active?.toman ?? null, checking,
    errors: active?.errors ?? {}, error: '',
    change, apply, clear: () => change(''),
    needsApply: Boolean(code.trim()) && !active?.stars,
    tomanNeedsApply: Boolean(code.trim()) && !active?.toman,
  }
}
