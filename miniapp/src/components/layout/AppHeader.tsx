import { useLocation, useNavigate } from 'react-router-dom'
import type { Category, Product } from '../../features/catalog/types'
import { ProductSearch } from '../catalog/ProductSearch'
import { Icon, type IconName } from '../ui/Icon'
import { ThemeToggle } from './ThemeToggle'

interface AppHeaderProps {
  categories: Category[]
  products: Product[]
}

function resolveHeader(pathname: string, categories: Category[], products: Product[]) {
  const categoryId = pathname.match(/^\/categories\/([^/]+)/)?.[1]
  const productId = pathname.match(/^\/products\/([^/]+)/)?.[1]
  const category = categories.find((item) => item.id === categoryId)
  const product = products.find((item) => item.id === productId)

  const header = pathname.startsWith('/orders') ? { title: 'سفارش‌ها', icon: 'orders' as IconName }
    : pathname.startsWith('/downloads') ? { title: 'دانلودها', icon: 'download' as IconName }
      : pathname.startsWith('/tickets') ? { title: 'تیکت‌ها', icon: 'tickets' as IconName }
        : pathname.startsWith('/profile') ? { title: 'پروفایل', icon: 'profile' as IconName }
          : categoryId ? { title: category?.title || 'دسته‌بندی', icon: 'box' as IconName }
            : productId ? { title: product?.title || 'جزئیات محصول', icon: 'shop' as IconName }
              : { title: 'فروشگاه', icon: 'shop' as IconName }

  return {
    ...header,
    isDetail: Boolean(categoryId || productId),
    showSearch: pathname === '/',
  }
}

export function AppHeader({ categories, products }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const header = resolveHeader(location.pathname, categories, products)

  return (
    <header className="top-region">
      <div className={`header-navigation ${header.isDetail ? 'is-detail' : ''}`}>
        <div className="header-title-group">
          <span className="header-title-icon"><Icon name={header.icon} size={22} /></span>
          <div className="header-title-copy"><h1>{header.title}</h1></div>
        </div>
        <div className="header-actions">
          {header.isDetail ? (
            <button className="header-back" onClick={() => navigate(-1)} aria-label="بازگشت">
              <span>بازگشت</span><Icon name="back" size={18} />
            </button>
          ) : (
            <>
              <ThemeToggle />
              {header.showSearch && <ProductSearch products={products} />}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
