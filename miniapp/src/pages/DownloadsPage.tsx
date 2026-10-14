import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { DeliveryCard } from '../components/commerce/DeliveryCard'
import { StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { Product } from '../features/catalog/types'
import type { Delivery } from '../features/commerce/types'
import { editorDeliveries } from '../features/content/editorFixtures'

interface DownloadsPageProps { initDataRaw: string | null; products: Product[]; preview?: boolean; scenario?: string }

export function DownloadsPage({ initDataRaw, products, preview = false, scenario = 'content' }: DownloadsPageProps) {
  const location = useLocation()
  const expectedOrderID = (location.state as { orderId?: string } | null)?.orderId
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<Delivery[]> => {
    if (preview) {
      const result = editorDeliveries(products)
      setDeliveries(result)
      setError(null)
      setLoading(false)
      return result
    }
    if (!initDataRaw) {
      setLoading(false)
      return []
    }
    try {
      const result = await new ApiClient({ initDataRaw }).get<Delivery[]>('/payment/deliveries')
      setDeliveries(result)
      setError(null)
      return result
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'دانلودها دریافت نشد')
      return []
    } finally { setLoading(false) }
  }, [initDataRaw, preview, products])

  useEffect(() => {
    let active = true
    const refreshUntilDelivered = async () => {
      for (let attempt = 0; attempt < (expectedOrderID ? 8 : 1); attempt += 1) {
        const result = await load()
        if (!active || !expectedOrderID || result.some((delivery) => delivery.order_id === expectedOrderID)) return
        await new Promise((resolve) => window.setTimeout(resolve, 1000))
      }
    }
    void refreshUntilDelivered()
    return () => { active = false }
  }, [expectedOrderID, load])

  const visibleDeliveries = preview && scenario === 'empty' ? [] : deliveries
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'دانلودها دریافت نشد' : error
  const readyCount = visibleDeliveries.filter((delivery) => delivery.status === 'delivered').length
  const processingCount = visibleDeliveries.filter((delivery) => delivery.status === 'processing').length
  const itemCount = visibleDeliveries.reduce((sum, delivery) => sum + delivery.items.length, 0)

  if (visibleLoading) return <div className="page"><div className="commerce-loading skeleton" /></div>
  if (visibleError) return <StateCard title="دریافت محصولات ناموفق بود" body={visibleError} />

  return (
    <div className="page commerce-page">
      {visibleDeliveries.length === 0 ? (
        <section className="commerce-empty"><Icon name="download" size={30} /><h2>هنوز محصولی تحویل نشده</h2><p>بعد از پرداخت موفق، محصول شما اینجا قرار می‌گیرد.</p><button onClick={() => void load()}>به‌روزرسانی</button></section>
      ) : (
        <>
          <section className="commerce-dashboard downloads-dashboard">
            <div className="commerce-dashboard-head">
              <span className="commerce-dashboard-icon"><Icon name="download" size={21} /></span>
              <div><strong>کتابخانه من</strong><p>همه فایل‌ها و دسترسی‌های خریداری‌شده</p></div>
              <button type="button" className="commerce-refresh" onClick={() => void load()} aria-label="به‌روزرسانی"><Icon name="refresh" size={16} /></button>
            </div>
            <div className="commerce-stats">
              <div className="is-success"><strong>{readyCount.toLocaleString('fa-IR')}</strong><span>محصول آماده</span></div>
              <div><strong>{itemCount.toLocaleString('fa-IR')}</strong><span>محتوای قابل دریافت</span></div>
              <div className="is-warning"><strong>{processingCount.toLocaleString('fa-IR')}</strong><span>در حال آماده‌سازی</span></div>
            </div>
          </section>
          <div className="delivery-list">{visibleDeliveries.map((delivery) => <DeliveryCard delivery={delivery} key={delivery.order_id} />)}</div>
        </>
      )}
    </div>
  )
}
