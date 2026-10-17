import { useEffect, useRef, useState } from 'react'
import { ApiClient } from '../../api/client'

export interface CouponQuote {
  valid: boolean
  code: string
  product_id: string
  original_stars: number
  discount_stars: number
  payable_stars: number
  message?: string
}

export function useProductCoupon(productId: string, price: number, initDataRaw: string | null, preview: boolean) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<CouponQuote | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    generation.current++
    setCode(''); setResult(null); setError(''); setChecking(false)
    return () => { generation.current++ }
  }, [productId, price, initDataRaw])
  const change = (value: string) => {
    generation.current++
    setCode(value); setResult(null); setError(''); setChecking(false)
  }
  const apply = async () => {
    if (preview || !initDataRaw || !code.trim() || checking) return
    const current = ++generation.current
    setChecking(true); setError(''); setResult(null)
    try {
      const quote = await new ApiClient({ initDataRaw }).post<CouponQuote>('/coupon/validate', { product_id: productId, code: code.trim() })
      if (current !== generation.current) return
      if (!quote.valid) { setError(quote.message || 'کد تخفیف معتبر نیست.'); return }
      if (quote.product_id !== productId || quote.original_stars !== price || !Number.isSafeInteger(quote.payable_stars) || quote.payable_stars < 0 || quote.discount_stars <= 0 || quote.payable_stars + quote.discount_stars !== price) {
        setError('قیمت محصول تغییر کرده؛ صفحه را دوباره باز کنید.'); return
      }
      setCode(quote.code); setResult(quote)
    } catch (reason) { if (current === generation.current) setError(reason instanceof Error ? reason.message : 'بررسی کد تخفیف ناموفق بود.') }
    finally { if (current === generation.current) setChecking(false) }
  }
  const quote = result?.product_id === productId && result.original_stars === price && result.code === code.trim() ? result : null
  return { code, quote, checking, error, change, apply, clear: () => change(''), needsApply: Boolean(code.trim()) && !quote }
}
