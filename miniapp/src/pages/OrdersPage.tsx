import { useEffect, useMemo, useState } from 'react'
import { ApiClient } from '../api/client'
import { StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { Product, PaginatedResponse } from '../features/catalog/types'
import type { Order } from '../features/commerce/types'
import { formatDate, formatPrice } from '../utils/format'

const statusLabel: Record<Order['status'], string> = {
  pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق',
  refunded: 'بازپرداخت‌شده', cancelled: 'لغوشده',
}

interface OrdersPageProps { initDataRaw: string | null; products: Product[] }

export function OrdersPage({ initDataRaw, products }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  useEffect(() => {
    if (!initDataRaw) return
    new ApiClient({ initDataRaw }).get<PaginatedResponse<Order>>('/order?per_page=100')
      .then((response) => setOrders(response.data))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'سفارش‌ها دریافت نشد'))
      .finally(() => setLoading(false))
  }, [initDataRaw])

  if (loading) return <div className="page"><div className="commerce-loading skeleton" /></div>
  if (error) return <StateCard title="دریافت سفارش‌ها ناموفق بود" body={error} />

  return (
    <div className="page commerce-page">
      {orders.length === 0 ? (
        <section className="commerce-empty"><Icon name="orders" size={30} /><h2>هنوز سفارشی ندارید</h2><p>محصول دلخواهتان را از فروشگاه انتخاب کنید.</p></section>
      ) : orders.map((order) => {
        const product = productById.get(order.product_id)
        return (
          <article className="order-card" key={order.id}>
            <div className="order-card-main">
              <span className="commerce-icon"><Icon name="orders" size={19} /></span>
              <div><h3>{product?.title || 'محصول دیجیتال'}</h3><p>{formatDate(order.created_at)}</p></div>
            </div>
            <div className="order-card-footer">
              <span className={`order-status status-${order.status}`}>{statusLabel[order.status]}</span>
              <strong>{order.payment_method === 'telegram_stars' && product
                ? `${product.stars_price.toLocaleString('fa-IR')} ⭐`
                : formatPrice(order.amount)}</strong>
            </div>
          </article>
        )
      })}
    </div>
  )
}
