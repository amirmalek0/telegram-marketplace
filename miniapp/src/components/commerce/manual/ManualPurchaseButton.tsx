import { useEffect, useRef, useState } from 'react'
import { useContent } from '../../../features/content/ContentProvider'
import { manualPreviewPayment } from '../../../features/content/manualPreview'
import { ApiClient } from '../../../api/client'
import { type ManualPayment } from '../../../features/commerce/manual'
import { ManualCheckout } from './LazyManualCheckout'
import { Icon } from '../../ui/Icon'
import type { CouponQuote } from '../../../features/commerce/useProductCoupon'
import '../../../styles/manual-payment.css'

export function ManualPurchaseButton({ purpose, targetID, availablePrice, couponQuote, couponBlocked, onBusyChange, initDataRaw, disabled, onChanged }: { couponQuote?: CouponQuote | null; couponBlocked?: boolean; onBusyChange?: (busy: boolean) => void; availablePrice?: number; purpose: 'product' | 'vip_plan' | 'wallet_topup'; targetID: string; initDataRaw?: string | null; disabled?: boolean; onChanged?: () => void }) {
  const { text, editorMode, editorScenario } = useContent()
  const [price, setPrice] = useState<number | null>(null), [payment, setPayment] = useState<ManualPayment | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { if (editorMode) setPayment(null) }, [editorMode, editorScenario])
  useEffect(() => { onBusyChange?.(busy || Boolean(payment)); return () => onBusyChange?.(false) }, [busy, payment, onBusyChange])
  const requestID = useRef('')
  const applicableCoupon = purpose === 'product' && couponQuote?.currency === 'toman' && couponQuote.product_id === targetID && couponQuote.original_stars === price ? couponQuote : null
  const couponCode = applicableCoupon?.code || ''
  useEffect(() => { requestID.current = crypto.randomUUID(); setPayment(null) }, [couponCode])
  useEffect(() => {
    setPrice(null); setPayment(null); setError(''); requestID.current = crypto.randomUUID()
    if (availablePrice !== undefined) { setPrice(availablePrice); return }
    if (editorMode) { setPrice(150000); return }
    if (!initDataRaw) return
    const controller = new AbortController()
    new ApiClient({ initDataRaw }).get<{ available: boolean; price?: { toman_price: number } }>(`/payment/manual/price?purpose=${purpose}&target_id=${targetID}`, controller.signal).then(result => setPrice(result.available ? result.price?.toman_price || null : null)).catch(() => {})
    return () => controller.abort()
  }, [purpose, targetID, initDataRaw, editorMode, availablePrice])
  const open = async () => {
    if (editorMode) { setPayment(manualPreviewPayment(purpose)); return }
    if (!initDataRaw || busy || disabled || couponBlocked) return
    setBusy(true); setError('')
    try {
      const api = new ApiClient({ initDataRaw })
      let next = await api.post<ManualPayment>('/payment/manual/checkout', { purpose, target_id: targetID, request_id: requestID.current, coupon_code: couponCode })
      if (['rejected', 'cancelled'].includes(next.status)) {
        requestID.current = crypto.randomUUID()
        next = await api.post<ManualPayment>('/payment/manual/checkout', { purpose, target_id: targetID, request_id: requestID.current, coupon_code: couponCode })
      }
      setPayment(next)
      if (next.status === 'approved') onChanged?.()
    } catch (e) { setError(e instanceof Error ? e.message : text('manual.purchase_error')) } finally { setBusy(false) }
  }
  if (!price) return null
  return <div className="manual-purchase"><button type="button" className="manual-purchase-button" disabled={disabled || busy || couponBlocked} onClick={() => void open()}><Icon name={busy ? 'clock' : 'lucide:credit-card'} size={19} /><span>{busy ? text('manual.preparing') : text('checkout.continue_bank')}</span><Icon name="arrow" size={17} /></button>{error && <p className="manual-error" role="alert">{error}</p>}{payment && (initDataRaw || editorMode) && <ManualCheckout preview={editorMode} initial={payment} initDataRaw={initDataRaw || ''} onChanged={onChanged} onClose={status => { if (status === 'cancelled' || status === 'approved' || status === 'rejected') requestID.current = crypto.randomUUID(); setPayment(null) }} />}</div>
}
