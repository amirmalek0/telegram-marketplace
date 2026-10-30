import { useEffect, useState } from 'react'
import { ApiClient } from '../../api/client'

import { useContent } from '../content/ContentProvider'
import { previewPaymentMethods } from '../content/manualPreview'

interface Methods { telegram_stars: boolean; card_to_card: boolean }
const unavailable: Methods = { telegram_stars: false, card_to_card: false }

// Fail closed while loading. The backend independently checks every checkout.
export function usePaymentMethods(initDataRaw?: string | null, productID = '', preview = false) {
  const { editorScenario } = useContent()
  const [state, setState] = useState<{ key: string; value: Methods } | null>(null)
  const key = `${initDataRaw || ''}:${productID}`
  useEffect(() => {
    if (!initDataRaw || preview) return
    const controller = new AbortController()
    let pending = false
    const load = async () => {
      if (pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        const value = await new ApiClient({ initDataRaw }).get<Methods>(`/payment/methods${productID ? `?product_id=${encodeURIComponent(productID)}` : ''}`, controller.signal)
        if (!controller.signal.aborted) setState({ key, value })
      } catch { if (!controller.signal.aborted) setState({ key, value: unavailable }) }
      finally { pending = false }
    }
    void load()
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', load)
    return () => { controller.abort(); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load) }
  }, [initDataRaw, productID, preview, key])
  return preview ? previewPaymentMethods(editorScenario) : state?.key === key ? state.value : unavailable
}
