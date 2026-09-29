import { useParams } from 'react-router-dom'
import { ProductCard } from '../components/catalog/ProductCard'
import { SectionHeading } from '../components/catalog/SectionHeading'
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
    <div className="page detail-page">
      <section className="category-hero">
        <span className="category-hero-icon">
          {category.icon_url ? <img src={publicAssetURL(category.icon_url)} alt="" /> : <Icon name="box" size={38} />}
        </span>
        <div>
          <p className="eyebrow">CATEGORY</p>
          <h2>{category.title}</h2>
          <p>{categoryProducts.length.toLocaleString('fa-IR')} محصول در این دسته</p>
        </div>
      </section>
      <SectionHeading title="همه محصولات" meta="مرتب‌شده بر اساس تازگی" />
      {categoryProducts.length > 0 ? (
        <div className="product-grid">
          {categoryProducts.map((product) => <ProductCard key={product.id} product={product} category={category} />)}
        </div>
      ) : <InlineEmpty text="در این دسته هنوز محصولی وجود ندارد." />}
    </div>
  )
}
