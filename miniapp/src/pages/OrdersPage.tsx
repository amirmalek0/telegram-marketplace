import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { OrderCard } from '../components/commerce/OrderCard'
import { ManualHistory } from '../components/commerce/manual/ManualHistory'
import { Icon } from '../components/ui/Icon'
import type { Product, PaginatedResponse } from '../features/catalog/types'
import type { Order } from '../features/commerce/types'
import { editorOrders } from '../features/content/editorFixtures'
import { renderSectionStatus, type SectionSourceProps } from '../features/content/sectionRendering'

interface OrdersPageProps extends SectionSourceProps { initDataRaw: string | null; products: Product[]; preview?: boolean; scenario?: string }

export function OrdersPage({ initDataRaw, products, preview = false, scenario = 'content', sectionRenderer }: OrdersPageProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<'all' | 'paid' | 'open'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  const loadOrders = useCallback(async () => {
    if (preview) {
      const nextOrders = editorOrders(products)
      setOrders(nextOrders)
      setTotal(nextOrders.length)
      setError(null)
      setLoading(false)
      return
    }
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
  }, [initDataRaw, preview, products])

  useEffect(() => { void loadOrders() }, [loadOrders])

  const visibleOrders = preview && scenario === 'empty' ? [] : orders
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'سفارش‌ها دریافت نشد' : error
  const visibleTotal = preview ? visibleOrders.length : total
  const paidCount = visibleOrders.filter((order) => order.status === 'paid').length
  const openCount = visibleOrders.filter((order) => order.status === 'pending' || order.delivery_status === 'processing').length
  const filteredOrders = filter === 'paid'
    ? visibleOrders.filter((order) => order.status === 'paid')
    : filter === 'open'
      ? visibleOrders.filter((order) => order.status === 'pending' || order.delivery_status === 'processing')
      : visibleOrders

  if (visibleLoading) return renderSectionStatus(sectionRenderer, <div className="page order-page"><div className="order-skeleton skeleton" /><div className="order-skeleton skeleton" /></div>)
  if (visibleError) return renderSectionStatus(sectionRenderer, <div className="page"><section className="commerce-empty"><Icon name="orders" size={30} /><h2>دریافت سفارش‌ها ناموفق بود</h2><p>{visibleError}</p><button onClick={() => void loadOrders()}>تلاش دوباره</button></section></div>)
  if (visibleOrders.length === 0) return renderSectionStatus(sectionRenderer, <><ManualHistory initDataRaw={initDataRaw} preview={preview} scenario={scenario} /><section className="commerce-empty"><Icon name="orders" size={30} /><h2>هنوز سفارشی ندارید</h2><p>محصول دلخواهتان را از فروشگاه انتخاب کنید.</p><NavLink to="/">رفتن به فروشگاه</NavLink></section></>)
  const summary = (
          <section className="commerce-dashboard orders-dashboard">
            <div className="commerce-dashboard-head">
              <span className="commerce-dashboard-icon"><Icon name="orders" size={21} /></span>
              <div><strong>سفارش‌های من</strong><p>سوابق پرداخت و وضعیت تحویل محصولات</p></div>
              <button type="button" className="commerce-refresh" onClick={() => void loadOrders()} aria-label="به‌روزرسانی"><Icon name="refresh" size={16} /></button>
            </div>
            <div className="commerce-stats">
              <div><strong>{visibleTotal.toLocaleString('fa-IR')}</strong><span>همه سفارش‌ها</span></div>
              <div className="is-success"><strong>{paidCount.toLocaleString('fa-IR')}</strong><span>پرداخت‌شده</span></div>
              <div className="is-warning"><strong>{openCount.toLocaleString('fa-IR')}</strong><span>در جریان</span></div>
            </div>
          </section>
  )
  const list = <>
          <ManualHistory initDataRaw={initDataRaw} preview={preview} scenario={scenario} />
          <div className="commerce-filters" role="group" aria-label="فیلتر سفارش‌ها">
            <button type="button" aria-pressed={filter === 'all'} className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>همه</button>
            <button type="button" aria-pressed={filter === 'paid'} className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>پرداخت‌شده</button>
            <button type="button" aria-pressed={filter === 'open'} className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>در جریان</button>
          </div>
          <div className="order-list">
            {filteredOrders.map((order) => <OrderCard order={order} product={productById.get(order.product_id)} key={order.id} />)}
            {filteredOrders.length === 0 && <div className="commerce-filter-empty"><Icon name="orders" size={20} /><span>سفارشی در این وضعیت نیست</span></div>}
          </div>
        </>
  return sectionRenderer ? sectionRenderer({ slots: { 'orders.summary': summary, 'orders.list': list } }) : <div className="page order-page">{summary}{list}</div>
}
