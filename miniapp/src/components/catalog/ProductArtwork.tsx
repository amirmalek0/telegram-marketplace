import { deliveryGradients } from '../../features/catalog/constants'
import type { Product } from '../../features/catalog/types'
import { publicAssetURL } from '../../utils/assets'
import { Icon } from '../ui/Icon'

interface ProductArtworkProps {
  product: Product
  large?: boolean
}

export function ProductArtwork({ product, large = false }: ProductArtworkProps) {
  const fallbackIcon = product.delivery_type === 'file'
    ? 'download'
    : product.delivery_type === 'message' ? 'tickets' : 'box'

  return (
    <div className={`product-artwork ${deliveryGradients[product.delivery_type]} ${product.image_url ? 'has-image' : ''} ${large ? 'is-large' : ''}`}>
      <span className="artwork-symbol">
        <Icon name={fallbackIcon} size={large ? 46 : 34} />
      </span>
      {product.image_url && (
        <img
          className="product-image"
          src={publicAssetURL(product.image_url)}
          alt={product.title}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
        />
      )}
      <span className="artwork-glow" />
    </div>
  )
}
