import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import type { Product } from '../../features/catalog/types'
import type { Order } from '../../features/commerce/types'
import { publicAssetURL } from '../../utils/assets'
import { formatDateTime } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface OrderCardProps {
  order: Order
  product?: Product
}

const statusMeta: Record<Order['status'], { label: string; detail: string }> = {
  pending: { label: 'در انتظار پرداخت', detail: 'پرداخت این سفارش هنوز کامل نشده است' },
  paid: { label: 'پرداخت موفق', detail: 'پرداخت با تلگرام استار تأیید شده است' },
  failed: { label: 'پرداخت ناموفق', detail: 'برای خرید می‌توانید دوباره تلاش کنید' },
  refunded: { label: 'بازپرداخت‌شده', detail: 'مبلغ این سفارش بازگردانده شده است' },
  cancelled: { label: 'لغوشده', detail: 'این فرایند خرید تکمیل نشده است' },
}

const deliveryLabels: Record<NonNullable<Order['delivery_status']>, string> = {
  awaiting_payment: 'منتظر پرداخت',
  processing: 'در حال آماده‌سازی',
  delivered: 'آماده دریافت',
  failed: 'نیازمند بررسی',
}

function formatStars(value: unknown) {
  const stars = Number(value)
  return Number.isFinite(stars) && stars > 0 ? `${stars.toLocaleString('fa-IR')} ⭐` : '—'
}

export function OrderCard({ order, product }: OrderCardProps) {
  const imageURL = product?.image_url ? publicAssetURL(product.image_url) : ''
  const [loadedImageURL, setLoadedImageURL] = useState<string | null>(null)
  const [failedImageURL, setFailedImageURL] = useState<string | null>(null)
  const imageLoaded = Boolean(imageURL) && loadedImageURL === imageURL
  const imageFailed = Boolean(imageURL) && failedImageURL === imageURL
  const imageLoading = Boolean(imageURL) && !imageLoaded && !imageFailed
  const status = statusMeta[order.status]
  const isPaid = order.status === 'paid'
  const actionLabel = isPaid
    ? order.delivery_status === 'delivered' ? 'دریافت محتوا' : 'پیگیری تحویل'
    : order.status === 'pending' ? 'مشاهده محصول' : 'خرید دوباره'

  return (
    <article className={`order-card order-card-${order.status}`}>
      <div className="order-card-head">
        <div className={`order-artwork ${imageLoaded ? 'is-image-loaded' : ''}`}>
          <Icon name="box" size={22} />
          {imageURL && !imageFailed && (
            <img
              src={imageURL}
              alt={product?.title || order.product_title}
              loading="lazy"
              onLoad={() => setLoadedImageURL(imageURL)}
              onError={() => setFailedImageURL(imageURL)}
            />
          )}
          {imageLoading && <span className="order-image-skeleton" aria-hidden="true" />}
        </div>
        <div className="order-card-title">
          <span className={`order-status status-${order.status}`}>{status.label}</span>
          <h3>{order.product_title || product?.title || 'محصول دیجیتال'}</h3>
          <p><Icon name="clock" size={12} /> {formatDateTime(order.paid_at || order.created_at)}</p>
        </div>
      </div>

      <p className="order-status-detail">{status.detail}</p>

      <div className="order-facts">
        <div><small>مبلغ سفارش</small><strong>{formatStars(order.stars)}</strong></div>
        <div><small>تعداد</small><strong>{Math.max(1, Number(order.quantity) || 1).toLocaleString('fa-IR')}</strong></div>
        <div>
          <small>تحویل</small>
          <strong>{order.delivery_status ? deliveryLabels[order.delivery_status] : isPaid ? 'در حال بررسی' : 'پس از پرداخت'}</strong>
        </div>
      </div>

      <div className="order-card-action-row">
        {isPaid && order.delivery_item_count > 0 && (
          <span><Icon name="check" size={13} /> {order.delivery_item_count.toLocaleString('fa-IR')} مورد آماده</span>
        )}
        <NavLink to={`/products/${order.product_id}`}>
          {actionLabel}<Icon name="arrow" size={14} />
        </NavLink>
      </div>
    </article>
  )
}
