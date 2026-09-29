import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiClient } from '../api/client'
import { ProductArtwork } from '../components/catalog/ProductArtwork'
import { ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon, type IconName } from '../components/ui/Icon'
import { deliveryLabels } from '../features/catalog/constants'
import type { CatalogState, Product } from '../features/catalog/types'
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
  const [product, setProduct] = useState<Product | undefined>(() => products.find((item) => item.id === productId))
  const [loading, setLoading] = useState(!product)
  const [error, setError] = useState<string | null>(null)

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
          <small>قیمت نهایی</small>
          <strong>{formatPrice(product.price)}</strong>
          <span>تحویل امن پس از پرداخت</span>
        </div>
        <button type="button" onClick={() => window.alert('فرآیند خرید به‌زودی فعال می‌شود.')}>
          <span>خرید محصول</span><Icon name="arrow" size={17} />
        </button>
      </section>

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
    </div>
  )
}
