import { CategoryCard } from '../components/catalog/CategoryCard'
import { ProductCard } from '../components/catalog/ProductCard'
import { SectionHeading } from '../components/catalog/SectionHeading'
import { InlineEmpty, ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import type { CatalogState } from '../features/catalog/types'

interface ShopPageProps extends CatalogState { preview?: boolean; scenario?: string }

export function ShopPage({ categories, products, categoryById, loading, error, preview = false, scenario = 'content' }: ShopPageProps) {
  const visibleCategories = preview && (scenario === 'empty' || scenario === 'empty-categories') ? [] : categories
  const visibleProducts = preview && (scenario === 'empty' || scenario === 'empty-products') ? [] : products
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'دریافت اطلاعات فروشگاه ناموفق بود' : error

  if (visibleLoading) return <ShopSkeleton />
  if (visibleError) return <StateCard title="فروشگاه بارگذاری نشد" body={visibleError} />

  return (
    <div className="page shop-page">
      <section className="shop-section">
      <SectionHeading title="دسته‌بندی‌ها" icon="box" tone="purple" />
      {visibleCategories.length > 0 ? (
        <div className="category-rail horizontal-scroll">
          {visibleCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      ) : <InlineEmpty text="دسته‌بندی‌ای با این جست‌وجو پیدا نشد." />}
      </section>
      <section className="shop-section">
      <SectionHeading title="تازه‌ترین محصولات" icon="sparkles" tone="blue" />
      {visibleProducts.length > 0 ? (
        <div className="product-rail">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} category={categoryById.get(product.category_id)} />
          ))}
        </div>
      ) : <InlineEmpty text="محصولی برای نمایش وجود ندارد." />}
      </section>
    </div>
  )
}
