import { useEffect, useState } from 'react'
import { ApiClient } from '../../api/client'
import type { CheckoutPurpose } from './checkoutPresentation'

export function useManualPriceState(purpose: CheckoutPurpose, targetID: string, enabled: boolean, initDataRaw?: string | null, preview = false) {
  const key = JSON.stringify([purpose, targetID, enabled, initDataRaw, preview])
  const [state, setState] = useState<{ key: string; price: number | null; error: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled || !targetID || preview || !initDataRaw) return
    const controller = new AbortController()
    new ApiClient({ initDataRaw }).get<{ available: boolean; price?: { toman_price: number } }>(
      `/payment/manual/price?purpose=${purpose}&target_id=${encodeURIComponent(targetID)}`, controller.signal
    ).then(result => {
      const price = result.price?.toman_price
      if (!controller.signal.aborted) setState({ key, price: result.available && price && Number.isSafeInteger(price) && price > 0 ? price : null, error: false })
    }).catch(() => { if (!controller.signal.aborted) setState({ key, price: null, error: true }) })
    return () => controller.abort()
  }, [key, purpose, targetID, enabled, initDataRaw, preview, attempt])
  const active = enabled && Boolean(targetID)
  return {
    price: !active ? null : preview ? 150000 : state?.key === key ? state.price : null,
    loading: active && !preview && Boolean(initDataRaw) && state?.key !== key,
    error: active && !preview && state?.key === key && state.error,
    retry: () => { setState(null); setAttempt(value => value + 1) },
  }
}

export function useManualPrice(purpose: CheckoutPurpose, targetID: string, enabled: boolean, initDataRaw?: string | null, preview = false) {
  return useManualPriceState(purpose, targetID, enabled, initDataRaw, preview).price
}
export type ManualPriceState = ReturnType<typeof useManualPriceState>
