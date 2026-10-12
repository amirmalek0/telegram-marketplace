import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { OrderCard } from '../components/commerce/OrderCard'
import { Icon } from '../components/ui/Icon'
import type { Product, PaginatedResponse } from '../features/catalog/types'
import type { Order } from '../features/commerce/types'

interface OrdersPageProps { initDataRaw: string | null; products: Product[] }

export function OrdersPage({ initDataRaw, products }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const loadOrders = useCallback(async () => {
    if (!initDataRaw) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await new ApiClient({ initDataRaw }).get<PaginatedResponse<Order>>('/order?per_page=100')
      setOrders(response.data)
      setTotal(response.total)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'سفارش‌ها دریافت نشد')
    } finally {
      setLoading(false)
    }
  }, [initDataRaw])

  useEffect(() => { void loadOrders() }, [loadOrders])

  if (loading) return <div className="page order-page"><div className="order-skeleton skeleton" /><div className="order-skeleton skeleton" /></div>
  if (error) return <div className="page"><section className="commerce-empty"><Icon name="orders" size={30} /><h2>دریافت سفارش‌ها ناموفق بود</h2><p>{error}</p><button onClick={() => void loadOrders()}>تلاش دوباره</button></section></div>

  return (
    <div className="page order-page">
      {orders.length === 0 ? (
        <section className="commerce-empty"><Icon name="orders" size={30} /><h2>هنوز سفارشی ندارید</h2><p>محصول دلخواهتان را از فروشگاه انتخاب کنید.</p><NavLink to="/">رفتن به فروشگاه</NavLink></section>
      ) : (
        <>
          <section className="orders-overview">
            <span className="orders-overview-icon"><Icon name="orders" size={21} /></span>
            <div><strong>{total.toLocaleString('fa-IR')} سفارش</strong><p>سوابق پرداخت و وضعیت تحویل محصولات</p></div>
            <button type="button" onClick={() => void loadOrders()}>به‌روزرسانی</button>
          </section>
          <div className="order-list">
            {orders.map((order) => <OrderCard order={order} product={productById.get(order.product_id)} key={order.id} />)}
          </div>
        </>
      )}
    </div>
  )
}
