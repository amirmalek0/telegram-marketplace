import { useState } from 'react'
import { deliveryGradients } from '../../features/catalog/constants'
import type { Product } from '../../features/catalog/types'
import { publicAssetURL } from '../../utils/assets'
import { Icon } from '../ui/Icon'

interface ProductArtworkProps {
  product: Product
  large?: boolean
}

export function ProductArtwork({ product, large = false }: ProductArtworkProps) {
  const imageURL = product.image_url ? publicAssetURL(product.image_url) : ''
  const [loadedImageURL, setLoadedImageURL] = useState<string | null>(null)
  const [failedImageURL, setFailedImageURL] = useState<string | null>(null)
  const imageLoaded = Boolean(imageURL) && loadedImageURL === imageURL
  const imageFailed = Boolean(imageURL) && failedImageURL === imageURL
  const imageLoading = Boolean(imageURL) && !imageLoaded && !imageFailed
  const fallbackIcon = product.delivery_type === 'file'
    ? 'download'
    : product.delivery_type === 'message' ? 'tickets' : 'box'

  return (
    <div className={`product-artwork ${deliveryGradients[product.delivery_type]} ${imageURL && !imageFailed ? 'has-image' : ''} ${imageLoading ? 'is-image-loading' : ''} ${imageLoaded ? 'is-image-loaded' : ''} ${large ? 'is-large' : ''}`}>
      <span className="artwork-symbol">
        <Icon name={fallbackIcon} size={large ? 46 : 34} />
      </span>
      {imageURL && !imageFailed && (
        <img
          className="product-image"
          src={imageURL}
          alt={product.title}
          loading={large ? 'eager' : 'lazy'}
          onLoad={() => setLoadedImageURL(imageURL)}
          onError={() => setFailedImageURL(imageURL)}
        />
      )}
      {imageLoading && <span className="product-image-skeleton" aria-hidden="true" />}
      <span className="artwork-glow" />
    </div>
  )
}
