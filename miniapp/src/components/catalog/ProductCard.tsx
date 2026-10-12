import { NavLink } from 'react-router-dom'
import type { Category, Product } from '../../features/catalog/types'
import { Icon } from '../ui/Icon'
import { ProductArtwork } from './ProductArtwork'

interface ProductCardProps {
  product: Product
  category?: Category
}

export function ProductCard({ product, category }: ProductCardProps) {
  return (
    <NavLink to={`/products/${product.id}`} className="product-card pressable">
      <ProductArtwork product={product} />
      <div className="product-card-body">
        <div className="badge-row">
          <span className="soft-badge">{category?.title || 'بدون دسته'}</span>
          {product.vip_only && <span className="vip-badge"><Icon name="crown" size={12} /> ویژه</span>}
        </div>
        <h3>{product.title}</h3>
        <p className="product-description">{product.description || 'محصول دیجیتال با تحویل سریع و امن'}</p>
        <div className="product-meta-row">
          <span className="views"><span>{product.views_count.toLocaleString('fa-IR')}</span><Icon name="eye" size={14} /></span>
        </div>
        <div className="product-card-footer">
          <strong>{product.stars_price.toLocaleString('fa-IR')} ⭐</strong>
          <span className="product-card-action">مشاهده <Icon name="arrow" size={15} /></span>
        </div>
      </div>
    </NavLink>
  )
}
