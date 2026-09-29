import { CategoryCard } from '../components/catalog/CategoryCard'
import { ProductCard } from '../components/catalog/ProductCard'
import { SectionHeading } from '../components/catalog/SectionHeading'
import { InlineEmpty, ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import type { CatalogState } from '../features/catalog/types'

export function ShopPage({ categories, products, categoryById, loading, error }: CatalogState) {
  if (loading) return <ShopSkeleton />
  if (error) return <StateCard title="فروشگاه بارگذاری نشد" body={error} />

  return (
    <div className="page shop-page">
      <SectionHeading title="دسته‌بندی‌ها" meta={`${categories.length.toLocaleString('fa-IR')} دسته`} icon="box" tone="purple" />
      {categories.length > 0 ? (
        <div className="category-rail horizontal-scroll">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      ) : <InlineEmpty text="دسته‌بندی‌ای با این جست‌وجو پیدا نشد." />}

      <SectionHeading title="تازه‌ترین محصولات" meta={`${products.length.toLocaleString('fa-IR')} محصول`} icon="sparkles" tone="blue" />
      {products.length > 0 ? (
        <div className="product-rail">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} category={categoryById.get(product.category_id)} />
          ))}
        </div>
      ) : <InlineEmpty text="محصولی برای نمایش وجود ندارد." />}
    </div>
  )
}
