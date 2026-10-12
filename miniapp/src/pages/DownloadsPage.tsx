import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { DeliveryCard } from '../components/commerce/DeliveryCard'
import { StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { Delivery } from '../features/commerce/types'

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
      ) : deliveries.map((delivery) => <DeliveryCard delivery={delivery} key={delivery.order_id} />)}
    </div>
  )
}
