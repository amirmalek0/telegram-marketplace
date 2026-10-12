import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { openInvoice } from '@telegram-apps/sdk'
import { ApiClient } from '../api/client'
import { ProductArtwork } from '../components/catalog/ProductArtwork'
import { RelatedProducts } from '../components/catalog/RelatedProducts'
import { ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon, type IconName } from '../components/ui/Icon'
import { deliveryLabels } from '../features/catalog/constants'
import type { CatalogState, Product } from '../features/catalog/types'
import type { SimulatedPayment, StarsInvoice } from '../features/commerce/types'
import { formatDate, formatPrice } from '../utils/format'

interface ProductPageProps extends CatalogState {
  initDataRaw: string | null
}

interface ProductFactProps {
  icon: IconName
  label: string
  value: string
}

function ProductFact({ icon, label, value }: ProductFactProps) {
  return (
    <div className="product-fact">
      <span className="product-fact-icon"><Icon name={icon} size={17} /></span>
      <span className="product-fact-copy"><small>{label}</small><strong>{value}</strong></span>
    </div>
  )
}

export function ProductPage({ products, categoryById, initDataRaw }: ProductPageProps) {
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | undefined>(() => products.find((item) => item.id === productId))
  const [loading, setLoading] = useState(!product)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [testInvoice, setTestInvoice] = useState<StarsInvoice | null>(null)
  const [simulating, setSimulating] = useState<'succeeded' | 'failed' | 'cancelled' | null>(null)

  useEffect(() => {
    const existing = products.find((item) => item.id === productId)
    if (existing) {
      setProduct(existing)
      setLoading(false)
    }
    if (!initDataRaw || !productId) return

    let active = true
    new ApiClient({ initDataRaw }).get<Product>(`/product/${productId}`)
      .then((result) => { if (active) setProduct(result) })
      .catch((fetchError: unknown) => {
        if (active) setError(fetchError instanceof Error ? fetchError.message : 'محصول دریافت نشد')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [initDataRaw, productId, products])

  if (loading) return <ShopSkeleton />
  if (error || !product) return <StateCard title="محصول پیدا نشد" body={error || 'این محصول دیگر در دسترس نیست.'} />

  const category = categoryById.get(product.category_id)
  const deliveryIcon: IconName = product.delivery_type === 'file'
    ? 'download'
    : product.delivery_type === 'message' ? 'tickets' : 'box'

  const buyWithStars = async () => {
    if (!initDataRaw || purchasing) return
    setPurchasing(true)
    setPurchaseError(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/stars/invoice', { product_id: product.id })
      if (invoice.simulation_enabled) {
        setTestInvoice(invoice)
        return
      }
      if (!openInvoice.isAvailable()) {
        setPurchaseError('پرداخت تلگرام در این نسخه در دسترس نیست. تلگرام را به‌روزرسانی کنید.')
        return
      }
      setTestInvoice(null)
      const status = await openInvoice(invoice.invoice_url, 'url')
      if (status === 'paid') navigate('/downloads', { state: { orderId: invoice.order_id } })
      else if (status === 'failed') setPurchaseError('پرداخت ناموفق بود. دوباره تلاش کنید.')
    } catch (reason) {
      setPurchaseError(reason instanceof Error ? reason.message : 'ایجاد پرداخت ناموفق بود')
    } finally { setPurchasing(false) }
  }

  const simulatePayment = async (outcome: 'succeeded' | 'failed' | 'cancelled') => {
    if (!initDataRaw || !testInvoice || simulating) return
    setSimulating(outcome)
    setPurchaseError(null)
    try {
      const result = await new ApiClient({ initDataRaw }).post<SimulatedPayment>('/payment/stars/test/simulate', {
        payment_id: testInvoice.payment_id,
        outcome,
      })
      setTestInvoice(null)
      if (result.status === 'succeeded') navigate('/downloads', { state: { orderId: result.order_id } })
      else setPurchaseError(result.status === 'cancelled' ? 'پرداخت آزمایشی لغو شد.' : 'پرداخت آزمایشی ناموفق ثبت شد.')
    } catch (reason) {
      setPurchaseError(reason instanceof Error ? reason.message : 'شبیه‌سازی پرداخت ناموفق بود')
    } finally { setSimulating(null) }
  }

  return (
    <div className="page detail-page product-detail">
      <section className="product-detail-hero">
        <ProductArtwork product={product} large />
        {product.vip_only && <span className="product-hero-vip"><Icon name="crown" size={13} /> ویژه</span>}
      </section>

      <section className="product-summary-card">
        <div className="product-summary-badges">
          <span><Icon name="box" size={13} />{category?.title || 'بدون دسته'}</span>
          <span><Icon name={deliveryIcon} size={13} />{deliveryLabels[product.delivery_type]}</span>
        </div>
        <h2>{product.title}</h2>
        <p>{product.description || 'توضیحی برای این محصول ثبت نشده است.'}</p>
      </section>

      <section className="product-purchase-panel">
        <div className="product-price-copy">
          <small>پرداخت با تلگرام استار</small>
          <strong>{product.stars_price.toLocaleString('fa-IR')} ⭐</strong>
          <em>{formatPrice(product.price)}</em>
          <span>تحویل امن پس از پرداخت</span>
        </div>
        <button type="button" disabled={purchasing || product.stars_price <= 0} onClick={() => void buyWithStars()}>
          <span>{purchasing ? 'در حال اتصال…' : 'خرید محصول'}</span><Icon name="arrow" size={17} />
        </button>
      </section>
      {purchaseError && <p className="purchase-error">{purchaseError}</p>}
      {testInvoice && (
        <section className="payment-simulator">
          <div><strong>حالت آزمایشی فروشگاه</strong><span>هیچ استاری مصرف نمی‌شود؛ نتیجه موردنظر را انتخاب کنید.</span></div>
          <div className="payment-simulator-actions">
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('succeeded')}>موفق</button>
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('failed')}>ناموفق</button>
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('cancelled')}>لغو</button>
          </div>
        </section>
      )}

      <section className="product-facts-card">
        <div className="product-section-title">
          <span><Icon name="sparkles" size={17} /></span>
          <h3>اطلاعات محصول</h3>
        </div>
        <div className="product-facts-grid">
          <ProductFact icon="box" label="دسته‌بندی" value={category?.title || 'بدون دسته'} />
          <ProductFact icon={deliveryIcon} label="روش تحویل" value={deliveryLabels[product.delivery_type]} />
          <ProductFact icon="eye" label="بازدید" value={`${product.views_count.toLocaleString('fa-IR')} بار`} />
          <ProductFact icon={product.vip_only ? 'crown' : 'profile'} label="دسترسی" value={product.vip_only ? 'کاربران VIP' : 'همه کاربران'} />
          <ProductFact icon="sparkles" label="تاریخ انتشار" value={formatDate(product.created_at)} />
        </div>
        {product.demo_url && (
          <a className="product-demo-link" href={product.demo_url} target="_blank" rel="noreferrer">
            <span>مشاهده نسخه نمایشی</span><Icon name="arrow" size={16} />
          </a>
        )}
      </section>

      <RelatedProducts currentProduct={product} products={products} category={category} />
    </div>
  )
}
