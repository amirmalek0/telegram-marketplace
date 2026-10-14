import type { Delivery, DeliveryItem } from '../../features/commerce/types'
import { publicAssetURL } from '../../utils/assets'
import { formatDate } from '../../utils/format'
import { Icon, type IconName } from '../ui/Icon'

interface DeliveryCardProps {
  delivery: Delivery
  showProductTitle?: boolean
}

const statusLabels: Record<Delivery['status'], string> = {
  delivered: 'آماده دریافت',
  processing: 'در حال آماده‌سازی',
  failed: 'نیازمند بررسی',
}

function itemIcon(kind: DeliveryItem['kind']): IconName {
  if (kind === 'file') return 'download'
  if (kind === 'message') return 'tickets'
  if (kind === 'inventory') return 'box'
  return 'sparkles'
}

export function DeliveryCard({ delivery, showProductTitle = true }: DeliveryCardProps) {
  return (
    <article className={`delivery-card${showProductTitle ? '' : ' delivery-card-compact'}`}>
      <header>
        {showProductTitle && <span className="delivery-product-icon"><Icon name={delivery.status === 'delivered' ? 'box' : 'clock'} size={20} /></span>}
        <div className="delivery-title-copy">
          {showProductTitle && <h3>{delivery.product_title}</h3>}
          <p>خرید در {formatDate(delivery.created_at)}</p>
        </div>
        <span className={`delivery-status delivery-${delivery.status}`}>{statusLabels[delivery.status]}</span>
      </header>
      {delivery.items.length > 0 ? (
        <div className="delivery-items">
          {delivery.items.map((item, index) => (
            <div className="delivery-item" key={`${delivery.order_id}-${item.kind}-${index}`}>
              <span className="commerce-icon"><Icon name={itemIcon(item.kind)} size={18} /></span>
              <div className="delivery-item-copy">
                <strong>{item.label}</strong>
                <small>{item.kind === 'file' ? 'فایل' : item.kind === 'message' ? 'پیام' : item.kind === 'inventory' ? 'کد آماده' : 'تحویل API'}</small>
                {item.content && <pre>{item.content}</pre>}
              </div>
              {item.download_url && <a href={publicAssetURL(item.download_url)} target="_blank" rel="noreferrer"><Icon name="download" size={14} /> دریافت فایل</a>}
            </div>
          ))}
        </div>
      ) : (
        <p className="delivery-pending-copy">
          {delivery.status === 'processing' ? 'محتوای این خرید در حال آماده‌سازی است.' : 'محتوای آماده‌ای برای این خرید وجود ندارد.'}
        </p>
      )}
    </article>
  )
}
