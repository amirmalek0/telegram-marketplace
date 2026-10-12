import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { openInvoice } from '@telegram-apps/sdk'
import { ApiClient } from '../api/client'
import { ProductArtwork } from '../components/catalog/ProductArtwork'
import { RelatedProducts } from '../components/catalog/RelatedProducts'
import { DeliveryCard } from '../components/commerce/DeliveryCard'
import { ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon, type IconName } from '../components/ui/Icon'
import { deliveryLabels } from '../features/catalog/constants'
import type { CatalogState, Product } from '../features/catalog/types'
import type { Delivery, SimulatedPayment, StarsInvoice, UserAccount, Wallet } from '../features/commerce/types'
import { formatDate } from '../utils/format'

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
  const [product, setProduct] = useState<Product | undefined>(() => products.find((item) => item.id === productId))
  const [loading, setLoading] = useState(!product)
  const [error, setError] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [testInvoice, setTestInvoice] = useState<StarsInvoice | null>(null)
  const [simulating, setSimulating] = useState<'succeeded' | 'failed' | 'cancelled' | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [accessLoading, setAccessLoading] = useState(Boolean(initDataRaw))
  const [accessError, setAccessError] = useState<string | null>(null)
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null)
  const [account, setAccount] = useState<UserAccount | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)

  const fetchProductDeliveries = useCallback(async (): Promise<Delivery[]> => {
    if (!initDataRaw || !productId) return []
    return new ApiClient({ initDataRaw }).get<Delivery[]>(`/payment/deliveries?product_id=${encodeURIComponent(productId)}`)
  }, [initDataRaw, productId])

  const fetchAccount = useCallback(async () => {
    if (!initDataRaw) return
    const api = new ApiClient({ initDataRaw })
    const [nextAccount, nextWallet] = await Promise.all([
      api.get<UserAccount>('/user/me'),
      api.get<Wallet>('/payment/wallet'),
    ])
    setAccount(nextAccount)
    setWallet(nextWallet)
  }, [initDataRaw])

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

  useEffect(() => {
    let active = true
    setAccessLoading(Boolean(initDataRaw))
    setAccessError(null)
    fetchProductDeliveries()
      .then((result) => { if (active) setDeliveries(result) })
      .catch((fetchError: unknown) => {
        if (active) setAccessError(fetchError instanceof Error ? fetchError.message : 'دسترسی‌های خرید دریافت نشد')
      })
      .finally(() => { if (active) setAccessLoading(false) })
    return () => { active = false }
  }, [fetchProductDeliveries, initDataRaw])

  useEffect(() => { void fetchAccount().catch(() => undefined) }, [fetchAccount])

  const refreshProductAccess = async (expectedOrderID: string) => {
    setAccessError(null)
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const result = await fetchProductDeliveries()
        setDeliveries(result)
        if (!expectedOrderID || result.some((delivery) => delivery.order_id === expectedOrderID)) return
      } catch (refreshError) {
        if (attempt === 7) {
          setAccessError(refreshError instanceof Error ? refreshError.message : 'دسترسی خرید دریافت نشد')
          return
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000))
    }
    setAccessError('پرداخت ثبت شد؛ آماده‌سازی محتوا کمی بیشتر زمان برد. دوباره تلاش کنید.')
  }

  if (loading) return <ShopSkeleton />
  if (error || !product) return <StateCard title="محصول پیدا نشد" body={error || 'این محصول دیگر در دسترس نیست.'} />

  const category = categoryById.get(product.category_id)
  const deliveryIcon: IconName = product.delivery_type === 'file'
    ? 'download'
    : product.delivery_type === 'message' ? 'tickets' : 'box'
  const purchaseLocked = product.repurchasable === false && deliveries.length > 0

  const buyProduct = async (method: 'telegram_stars' | 'wallet') => {
    if (!initDataRaw || purchasing) return
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseNotice(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/product/checkout', { product_id: product.id, method })
      if (invoice.completed) {
        setPurchaseNotice(product.vip_only && account?.has_active_plan ? 'این محصول با اشتراک VIP شما رایگان دریافت شد.' : 'خرید با کیف پول با موفقیت انجام شد.')
        await Promise.all([refreshProductAccess(invoice.order_id || ''), fetchAccount()])
        return
      }
      if (invoice.simulation_enabled) {
        setTestInvoice(invoice)
        return
      }
      if (!openInvoice.isAvailable()) {
        setPurchaseError('پرداخت تلگرام در این نسخه در دسترس نیست. تلگرام را به‌روزرسانی کنید.')
        return
      }
      setTestInvoice(null)
      if (!invoice.invoice_url) throw new Error('لینک پرداخت دریافت نشد')
      const status = await openInvoice(invoice.invoice_url, 'url')
      if (status === 'paid') {
        setPurchaseNotice('پرداخت موفق بود. محتوای خرید در همین صفحه آماده می‌شود.')
        await Promise.all([refreshProductAccess(invoice.order_id || ''), fetchAccount()])
      }
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
      if (result.status === 'succeeded') {
        setPurchaseNotice('پرداخت آزمایشی موفق بود. محتوای خرید در همین صفحه در دسترس است.')
        await Promise.all([refreshProductAccess(result.order_id || result.reference_id || ''), fetchAccount()])
      }
      else setPurchaseError(result.status === 'cancelled' ? 'پرداخت آزمایشی لغو شد.' : 'پرداخت آزمایشی ناموفق ثبت شد.')
    } catch (reason) {
      setPurchaseError(reason instanceof Error ? reason.message : 'شبیه‌سازی پرداخت ناموفق بود')
    } finally { setSimulating(null) }
  }

  const vipFree = Boolean(product.vip_only && account?.has_active_plan)
  const walletReady = Boolean(wallet && wallet.balance >= product.stars_price)

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
          <small>{vipFree ? 'هدیه اشتراک ویژه' : 'قیمت محصول'}</small>
          <strong>{vipFree ? 'رایگان با VIP' : `${product.stars_price.toLocaleString('fa-IR')} ⭐`}</strong>
          <span>{wallet ? `موجودی کیف پول: ${wallet.balance.toLocaleString('fa-IR')} ⭐` : 'تحویل امن پس از پرداخت'}</span>
        </div>
        <div className="product-payment-actions">
          <button type="button" disabled={purchasing || (!vipFree && product.stars_price <= 0) || purchaseLocked} onClick={() => void buyProduct('telegram_stars')}>
            <span>{purchasing ? 'در حال اتصال…' : purchaseLocked ? 'قبلاً خریداری شده' : vipFree ? 'دریافت با VIP' : 'پرداخت با Stars'}</span><Icon name={purchaseLocked ? 'check' : 'arrow'} size={17} />
          </button>
          {!vipFree && <button className="wallet-payment-button" type="button" disabled={purchasing || !walletReady || purchaseLocked} onClick={() => void buyProduct('wallet')}>
            <span>{walletReady ? 'خرید از کیف پول' : 'موجودی کیف پول ناکافی'}</span><Icon name="sparkles" size={15} />
          </button>}
        </div>
      </section>
      {purchaseLocked && <p className="purchase-notice"><Icon name="check" size={15} />این محصول فقط یک‌بار قابل خرید است؛ دسترسی شما در ادامه همین صفحه قرار دارد.</p>}
      {purchaseError && <p className="purchase-error">{purchaseError}</p>}
      {purchaseNotice && <p className="purchase-notice"><Icon name="check" size={15} />{purchaseNotice}</p>}
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

      {accessLoading && <section className="product-access-skeleton skeleton" aria-label="در حال دریافت خریدها" />}
      {!accessLoading && deliveries.length > 0 && (
        <section className="product-access-section">
          <div className="product-access-heading">
            <span><Icon name="download" size={18} /></span>
            <div><h3>دسترسی‌های شما</h3><p>{deliveries.length.toLocaleString('fa-IR')} خرید از این محصول</p></div>
          </div>
          <div className="product-access-list">
            {deliveries.map((delivery) => <DeliveryCard delivery={delivery} showProductTitle={false} key={delivery.order_id} />)}
          </div>
        </section>
      )}
      {accessError && (
        <section className="product-access-error">
          <span>{accessError}</span>
          <button type="button" onClick={() => void refreshProductAccess('')}>تلاش دوباره</button>
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
          <ProductFact icon="orders" label="دفعات خرید" value={product.repurchasable === false ? 'فقط یک‌بار' : 'بدون محدودیت'} />
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
