import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { openInvoice } from '@telegram-apps/sdk'
import { ApiClient } from '../api/client'
import { ProductPurchasePanel } from '../components/catalog/ProductPurchasePanel'
import { ProductArtwork } from '../components/catalog/ProductArtwork'
import { RelatedProducts } from '../components/catalog/RelatedProducts'
import { ProductAccessSection } from '../components/commerce/ProductAccessSection'
import { PurchaseNotice } from '../components/commerce/PurchaseNotice'
import { PaymentResultModal, type PaymentResult } from '../components/commerce/PaymentResultModal'
import { ProductSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon, type IconName } from '../components/ui/Icon'
import { deliveryLabels } from '../features/catalog/constants'
import type { CatalogState, Product } from '../features/catalog/types'
import type { Delivery, SimulatedPayment, StarsInvoice, UserAccount, Wallet } from '../features/commerce/types'
import { editorAccount, editorDeliveries, editorWallet } from '../features/content/editorFixtures'
import { formatDate } from '../utils/format'

interface ProductPageProps extends CatalogState {
  initDataRaw: string | null
  preview?: boolean
  scenario?: string
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

export function ProductPage({ products, categoryById, initDataRaw, preview = false, scenario = 'content' }: ProductPageProps) {
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
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const accessRef = useRef<HTMLDetailsElement>(null)

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

  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'not-found' ? 'این محصول دیگر در دسترس نیست.' : error

  if (visibleLoading) return <ProductSkeleton />
  if (visibleError || !product) return <StateCard title="محصول پیدا نشد" body={visibleError || 'این محصول دیگر در دسترس نیست.'} />

  const displayProduct: Product = preview && scenario === 'vip'
    ? { ...product, vip_only: true }
    : preview && scenario === 'purchased' ? { ...product, repurchasable: false } : product
  const visibleAccount = preview ? editorAccount : account
  const visibleWallet = preview ? editorWallet : wallet
  const visibleDeliveries = preview && (scenario === 'access' || scenario === 'purchased') ? editorDeliveries(products).slice(0, 1) : deliveries
  const visibleTestInvoice: StarsInvoice | null = preview && scenario === 'payment-test' ? {
    payment_id: 'preview-product-payment', stars: displayProduct.stars_price, simulation_enabled: true, completed: false, purpose: 'product',
  } : testInvoice
  const visiblePurchaseError = preview && scenario === 'purchase-error' ? 'پرداخت ناموفق بود. دوباره تلاش کنید.' : purchaseError
  const visiblePurchaseNotice = preview && scenario === 'success' ? 'پرداخت موفق بود. محتوای خرید در همین صفحه آماده می‌شود.' : purchaseNotice
  const visibleAccessError = preview && scenario === 'access-error' ? 'دسترسی‌های خرید دریافت نشد' : accessError
  const visibleAccessLoading = preview ? false : accessLoading

  const category = categoryById.get(displayProduct.category_id)
  const deliveryIcon: IconName = displayProduct.delivery_type === 'file'
    ? 'download'
    : displayProduct.delivery_type === 'message' ? 'tickets' : 'box'
  const purchaseLocked = displayProduct.repurchasable === false && visibleDeliveries.length > 0

  const buyProduct = async (method: 'telegram_stars' | 'wallet') => {
    if (!initDataRaw || purchasing) return
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseNotice(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/product/checkout', { product_id: product.id, method })
      if (invoice.completed) {
        const message = product.vip_only && account?.has_active_plan ? 'این محصول با اشتراک VIP شما رایگان دریافت شد.' : 'خرید با کیف پول با موفقیت انجام شد.'
        setPurchaseNotice(message)
        setPaymentResult({ kind: 'success', title: 'پرداخت موفق بود', message })
        await Promise.all([refreshProductAccess(invoice.order_id || ''), fetchAccount()])
        return
      }
      if (invoice.simulation_enabled) {
        setTestInvoice(invoice)
        return
      }
      if (!openInvoice.isAvailable()) {
        const message = 'پرداخت تلگرام در این نسخه در دسترس نیست. تلگرام را به‌روزرسانی کنید.'
        setPurchaseError(message)
        setPaymentResult({ kind: 'error', title: 'پرداخت انجام نشد', message })
        return
      }
      setTestInvoice(null)
      if (!invoice.invoice_url) throw new Error('لینک پرداخت دریافت نشد')
      const status = await openInvoice(invoice.invoice_url, 'url')
      if (status === 'paid') {
        const message = 'پرداخت موفق بود. محتوای خرید در همین صفحه آماده می‌شود.'
        setPurchaseNotice(message)
        setPaymentResult({ kind: 'success', title: 'پرداخت موفق بود', message })
        await Promise.all([refreshProductAccess(invoice.order_id || ''), fetchAccount()])
      }
      else if (status === 'failed') { const message = 'پرداخت ناموفق بود. دوباره تلاش کنید.'; setPurchaseError(message); setPaymentResult({ kind: 'error', title: 'پرداخت انجام نشد', message }) }
      else { const message = 'پرداخت توسط شما لغو شد و مبلغی کسر نشد.'; setPaymentResult({ kind: 'cancelled', title: 'پرداخت لغو شد', message }) }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'ایجاد پرداخت ناموفق بود'
      setPurchaseError(message)
      setPaymentResult({ kind: 'error', title: 'پرداخت انجام نشد', message })
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
        const message = 'پرداخت آزمایشی موفق بود. محتوای خرید در همین صفحه در دسترس است.'
        setPurchaseNotice(message)
        setPaymentResult({ kind: 'success', title: 'پرداخت موفق بود', message })
        await Promise.all([refreshProductAccess(result.order_id || result.reference_id || ''), fetchAccount()])
      }
      else { const cancelled = result.status === 'cancelled'; const message = cancelled ? 'پرداخت آزمایشی لغو شد.' : 'پرداخت آزمایشی ناموفق ثبت شد.'; setPurchaseError(message); setPaymentResult({ kind: cancelled ? 'cancelled' : 'error', title: cancelled ? 'پرداخت لغو شد' : 'پرداخت انجام نشد', message }) }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'شبیه‌سازی پرداخت ناموفق بود'
      setPurchaseError(message)
      setPaymentResult({ kind: 'error', title: 'پرداخت انجام نشد', message })
    } finally { setSimulating(null) }
  }

  const vipFree = Boolean(displayProduct.vip_only && visibleAccount?.has_active_plan)

  return (
    <div className="page detail-page product-detail">
      <section className="product-overview-card">
      <div className="product-detail-hero">
        <ProductArtwork product={displayProduct} large />
        {displayProduct.vip_only && <span className="product-hero-vip"><Icon name="crown" size={13} /> ویژه</span>}
      </div>

      <div className="product-summary-card">
        <div className="product-summary-badges">
          <span><Icon name="box" size={13} />{category?.title || 'بدون دسته'}</span>
          <span><Icon name={deliveryIcon} size={13} />{deliveryLabels[displayProduct.delivery_type]}</span>
        </div>
        <h2>{displayProduct.title}</h2>
      </div>
      </section>

      <ProductPurchasePanel
        stars={displayProduct.stars_price}
        walletBalance={visibleWallet?.balance}
        vipFree={vipFree}
        purchaseLocked={purchaseLocked}
        purchasing={purchasing}
        onPurchase={(method) => void buyProduct(method)}
        onOpenAccess={() => { if (accessRef.current) accessRef.current.open = true }}
      />
      {purchaseLocked && <PurchaseNotice tone="info">این محصول فقط یک‌بار قابل خرید است؛ دسترسی شما در ادامه همین صفحه قرار دارد.</PurchaseNotice>}
      {visiblePurchaseError && <PurchaseNotice tone="error">{visiblePurchaseError}</PurchaseNotice>}
      {visiblePurchaseNotice && <PurchaseNotice tone="success">{visiblePurchaseNotice}</PurchaseNotice>}
      {visibleTestInvoice && (
        <section className="payment-simulator">
          <div><strong>حالت آزمایشی فروشگاه</strong><span>هیچ استاری مصرف نمی‌شود؛ نتیجه موردنظر را انتخاب کنید.</span></div>
          <div className="payment-simulator-actions">
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('succeeded')}>موفق</button>
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('failed')}>ناموفق</button>
            <button disabled={Boolean(simulating)} onClick={() => void simulatePayment('cancelled')}>لغو</button>
          </div>
        </section>
      )}

      {visibleAccessLoading && <section className="product-access-skeleton skeleton" aria-label="در حال دریافت خریدها" />}
      {!visibleAccessLoading && visibleDeliveries.length > 0 && (
        <ProductAccessSection key={productId} ref={accessRef} deliveries={visibleDeliveries} />
      )}
      {visibleAccessError && (
        <section className="product-access-error">
          <span>{visibleAccessError}</span>
          <button type="button" onClick={() => void refreshProductAccess('')}>تلاش دوباره</button>
        </section>
      )}

      <section className="product-description-section">
        <h3>درباره محصول</h3>
        <p>{displayProduct.description || 'توضیحی برای این محصول ثبت نشده است.'}</p>
      </section>

      <section className="product-facts-card">
        <div className="product-section-title">
          <span><Icon name="sparkles" size={17} /></span>
          <h3>اطلاعات محصول</h3>
        </div>
        <div className="product-facts-grid">
          <ProductFact icon="box" label="دسته‌بندی" value={category?.title || 'بدون دسته'} />
          <ProductFact icon={deliveryIcon} label="روش تحویل" value={deliveryLabels[displayProduct.delivery_type]} />
          <ProductFact icon="eye" label="بازدید" value={`${displayProduct.views_count.toLocaleString('fa-IR')} بار`} />
          <ProductFact icon={displayProduct.vip_only ? 'crown' : 'profile'} label="دسترسی" value={displayProduct.vip_only ? 'کاربران VIP' : 'همه کاربران'} />
          <ProductFact icon="orders" label="دفعات خرید" value={displayProduct.repurchasable === false ? 'فقط یک‌بار' : 'بدون محدودیت'} />
          <ProductFact icon="sparkles" label="تاریخ انتشار" value={formatDate(displayProduct.created_at)} />
        </div>
        {displayProduct.demo_url && (
          <a className="product-demo-link" href={displayProduct.demo_url} target="_blank" rel="noreferrer">
            <span>مشاهده نسخه نمایشی</span><Icon name="arrow" size={16} />
          </a>
        )}
      </section>

      <RelatedProducts currentProduct={displayProduct} products={products} category={category} />
      <PaymentResultModal result={paymentResult} onClose={() => setPaymentResult(null)} />
    </div>
  )
}
