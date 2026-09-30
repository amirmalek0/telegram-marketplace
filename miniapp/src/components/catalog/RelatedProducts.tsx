import type { Category, Product } from '../../features/catalog/types'
import { InlineEmpty } from '../feedback/CatalogStates'
import { ProductCard } from './ProductCard'
import { SectionHeading } from './SectionHeading'

interface RelatedProductsProps {
  currentProduct: Product
  products: Product[]
  category?: Category
}

export function RelatedProducts({ currentProduct, products, category }: RelatedProductsProps) {
  const relatedProducts = products.filter(
    (product) => product.id !== currentProduct.id && product.category_id === currentProduct.category_id,
  )

  return (
    <section className="related-products-section">
      <SectionHeading title="محصولات مرتبط" icon="sparkles" tone="purple" />
      {relatedProducts.length > 0 ? (
        <div className="product-rail related-products-list">
          {relatedProducts.map((product) => (
            <ProductCard key={product.id} product={product} category={category} />
          ))}
        </div>
      ) : (
        <InlineEmpty text="در این دسته محصول مرتبط دیگری وجود ندارد." />
      )}
    </section>
  )
}
