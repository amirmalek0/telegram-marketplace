import { CategoryCard } from '../components/catalog/CategoryCard'
import { ProductCard } from '../components/catalog/ProductCard'
import { SectionHeading } from '../components/catalog/SectionHeading'
import { InlineEmpty, ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import type { CatalogState } from '../features/catalog/types'
import { useContent } from '../features/content/ContentProvider'
import '../styles/shop-designs.css'
import type { SectionSourceProps } from '../features/content/sectionRendering'
import { useLocation } from 'react-router-dom'
import { pageForPath } from '../features/content/pageLayouts'
import type { ShopDesigns } from '../features/content/shopDesigns'

interface ShopPageProps extends CatalogState, SectionSourceProps { preview?: boolean; scenario?: string }

export function ShopPage({ categories, products, categoryById, loading, error, preview = false, scenario = 'content', sectionRenderer }: ShopPageProps) {
  const { shopSections, shopDesigns, layoutForPage } = useContent()
  const location = useLocation()
  const layout = layoutForPage(pageForPath(location.pathname))
  const loadingDesigns: ShopDesigns = sectionRenderer ? {
    categories: (layout.sections.find(item => item.type === 'catalog.categories')?.design ?? shopDesigns.categories) as ShopDesigns['categories'],
    products: (layout.sections.find(item => item.type === 'catalog.products')?.design ?? shopDesigns.products) as ShopDesigns['products'],
  } : shopDesigns
  const visibleCategories = preview && (scenario === 'empty' || scenario === 'empty-categories') ? [] : categories
  const visibleProducts = preview && (scenario === 'empty' || scenario === 'empty-products') ? [] : products
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'دریافت اطلاعات فروشگاه ناموفق بود' : error

  if (sectionRenderer && visibleLoading) return sectionRenderer({ slots: {
    'catalog.categories': <ShopSkeleton sections={['categories']} designs={loadingDesigns} />,
    'catalog.products': <ShopSkeleton sections={['products']} designs={loadingDesigns} />,
  } })
  if (shopSections.length > 0 && visibleLoading) return <ShopSkeleton sections={shopSections} designs={shopDesigns} />
  if (visibleError && (sectionRenderer || shopSections.length > 0)) {
    const status = <StateCard title="فروشگاه بارگذاری نشد" body={visibleError} />
    return sectionRenderer ? sectionRenderer({ slots: {}, status }) : status
  }
  const categorySection = <section className="shop-section" data-shop-section="categories">
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
  const productSection = <section className="shop-section" data-shop-section="products">
      <SectionHeading title="تازه‌ترین محصولات" icon="sparkles" tone="blue" />
      {visibleProducts.length > 0 ? (
        <div className="product-rail">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} category={categoryById.get(product.category_id)} />
          ))}
        </div>
      ) : <InlineEmpty text="محصولی برای نمایش وجود ندارد." />}
      </section>
  if (sectionRenderer) return sectionRenderer({ slots: { 'catalog.categories': categorySection, 'catalog.products': productSection } })
  return <div className="page shop-page" data-category-design={shopDesigns.categories} data-product-design={shopDesigns.products}>
    {shopSections.map(section => <div key={section}>{section === 'categories' ? categorySection : productSection}</div>)}
  </div>
}
