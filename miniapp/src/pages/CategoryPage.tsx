import { useParams } from 'react-router-dom'
import { ProductCard } from '../components/catalog/ProductCard'
import { InlineEmpty, ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { CatalogState } from '../features/catalog/types'
import { publicAssetURL } from '../utils/assets'

export function CategoryPage({ products, categoryById, loading, error }: CatalogState) {
  const { categoryId = '' } = useParams()
  const category = categoryById.get(categoryId)
  const categoryProducts = products.filter((product) => product.category_id === categoryId)

  if (loading) return <ShopSkeleton />
  if (error) return <StateCard title="اطلاعات دریافت نشد" body={error} />
  if (!category) return <StateCard title="دسته‌بندی پیدا نشد" body="ممکن است این دسته حذف یا غیرفعال شده باشد." />

  return (
    <div className="page detail-page category-detail-page">
      <section className="category-showcase">
        <span className="category-showcase-icon">
          {category.icon_url ? <img src={publicAssetURL(category.icon_url)} alt="" /> : <Icon name="box" size={38} />}
        </span>
        <div className="category-showcase-copy">
          <h2>{category.title}</h2>
        </div>
        <span className="category-showcase-count">
          <strong>{categoryProducts.length.toLocaleString('fa-IR')}</strong>
          <small>محصول</small>
        </span>
      </section>

      <div className="category-products-heading">
        <span className="category-products-heading-icon"><Icon name="sparkles" size={17} /></span>
        <h3>محصولات این دسته</h3>
      </div>
      {categoryProducts.length > 0 ? (
        <div className="product-rail category-product-list">
          {categoryProducts.map((product) => <ProductCard key={product.id} product={product} category={category} />)}
        </div>
      ) : <InlineEmpty text="در این دسته هنوز محصولی وجود ندارد." />}
    </div>
  )
}
