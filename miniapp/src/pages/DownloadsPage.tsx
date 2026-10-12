import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { Delivery } from '../features/commerce/types'
import { formatDate } from '../utils/format'

interface DownloadsPageProps { initDataRaw: string | null }

export function DownloadsPage({ initDataRaw }: DownloadsPageProps) {
  const location = useLocation()
  const expectedOrderID = (location.state as { orderId?: string } | null)?.orderId
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<Delivery[]> => {
    if (!initDataRaw) return []
    try {
      const result = await new ApiClient({ initDataRaw }).get<Delivery[]>('/payment/deliveries')
      setDeliveries(result)
      setError(null)
      return result
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'دانلودها دریافت نشد')
      return []
    } finally { setLoading(false) }
  }, [initDataRaw])

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

  if (loading) return <div className="page"><div className="commerce-loading skeleton" /></div>
  if (error) return <StateCard title="دریافت محصولات ناموفق بود" body={error} />

  return (
    <div className="page commerce-page">
      {deliveries.length === 0 ? (
        <section className="commerce-empty"><Icon name="download" size={30} /><h2>هنوز محصولی تحویل نشده</h2><p>بعد از پرداخت موفق، محصول شما اینجا قرار می‌گیرد.</p><button onClick={() => void load()}>به‌روزرسانی</button></section>
      ) : deliveries.map((delivery) => (
        <article className="delivery-card" key={delivery.order_id}>
          <header><div><h3>{delivery.product_title}</h3><p>{formatDate(delivery.created_at)}</p></div><span className={`delivery-status delivery-${delivery.status}`}>{delivery.status === 'delivered' ? 'آماده' : delivery.status === 'processing' ? 'در حال آماده‌سازی' : 'نیازمند بررسی'}</span></header>
          <div className="delivery-items">
            {delivery.items.map((item, index) => (
              <div className="delivery-item" key={`${item.kind}-${index}`}>
                <span className="commerce-icon"><Icon name={item.kind === 'file' ? 'download' : 'sparkles'} size={18} /></span>
                <div className="delivery-item-copy"><strong>{item.label}</strong>{item.content && <pre>{item.content}</pre>}</div>
                {item.download_url && <a href={item.download_url} target="_blank" rel="noreferrer">دریافت فایل</a>}
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
