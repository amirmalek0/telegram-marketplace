import { useParams } from 'react-router-dom'
import { ProductCard } from '../components/catalog/ProductCard'
import { InlineEmpty, ShopSkeleton, StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { CatalogState } from '../features/catalog/types'
import { publicAssetURL } from '../utils/assets'
import { renderSectionStatus, type SectionSourceProps } from '../features/content/sectionRendering'

interface CategoryPageProps extends CatalogState, SectionSourceProps { preview?: boolean; scenario?: string }

export function CategoryPage({ products, categoryById, loading, error, preview = false, scenario = 'content', sectionRenderer }: CategoryPageProps) {
  const { categoryId = '' } = useParams()
  const category = preview && scenario === 'not-found' ? undefined : categoryById.get(categoryId)
  const categoryProducts = preview && scenario === 'empty' ? [] : products.filter((product) => product.category_id === categoryId)
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'دریافت اطلاعات فروشگاه ناموفق بود' : error

  if (visibleLoading) return renderSectionStatus(sectionRenderer, <ShopSkeleton />)
  if (visibleError) return renderSectionStatus(sectionRenderer, <StateCard title="اطلاعات دریافت نشد" body={visibleError} />)
  if (!category) return renderSectionStatus(sectionRenderer, <StateCard title="دسته‌بندی پیدا نشد" body="ممکن است این دسته حذف یا غیرفعال شده باشد." />)
  const overview = (
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
  )
  const list = <>
      <div className="category-products-heading">
        <span className="category-products-heading-icon"><Icon name="sparkles" size={17} /></span>
        <h3>محصولات این دسته</h3>
      </div>
      {categoryProducts.length > 0 ? (
        <div className="product-rail category-product-list">
          {categoryProducts.map((product) => <ProductCard key={product.id} product={product} category={category} />)}
        </div>
      ) : <InlineEmpty text="در این دسته هنوز محصولی وجود ندارد." />}
    </>
  return sectionRenderer ? sectionRenderer({ slots: { 'category.overview': overview, 'category.products': list } }) : <div className="page detail-page category-detail-page">{overview}{list}</div>
}
