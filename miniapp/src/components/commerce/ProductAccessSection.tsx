import { forwardRef } from 'react'
import type { Delivery } from '../../features/commerce/types'
import { Icon } from '../ui/Icon'
import { DeliveryCard } from './DeliveryCard'

interface ProductAccessSectionProps {
  deliveries: Delivery[]
}

export const ProductAccessSection = forwardRef<HTMLDetailsElement, ProductAccessSectionProps>(
  function ProductAccessSection({ deliveries }, ref) {
    return (
      <details className="product-access-section" id="product-access" ref={ref}>
        <summary className="product-access-toggle">
          <span className="product-access-icon"><Icon name="download" size={21} /></span>
          <span className="product-access-copy">
            <strong>دسترسی‌های شما</strong>
            <span>{deliveries.length.toLocaleString('fa-IR')} خرید از این محصول</span>
          </span>
          <span className="product-access-chevron"><Icon name="arrow" size={18} /></span>
        </summary>
        <div className="product-access-list">
          {deliveries.map((delivery) => (
            <DeliveryCard delivery={delivery} showProductTitle={false} key={delivery.order_id} />
          ))}
        </div>
      </details>
    )
  },
)
