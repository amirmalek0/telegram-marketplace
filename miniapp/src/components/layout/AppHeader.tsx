import { type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Category, Product } from '../../features/catalog/types'
import { ProductSearch } from '../catalog/ProductSearch'
import { Icon, type IconName } from '../ui/Icon'
import { ThemeToggle } from './ThemeToggle'
import { HeaderLogo } from './HeaderLogo'
import { useContent } from '../../features/content/ContentProvider'
import { visibleHeaderActions } from '../../features/content/headerSettings'
import '../../styles/header-themes.css'
import '../../styles/chrome-layout-presets.css'
import { headerLayoutPresets } from '../../features/content/chromeLayoutPresets'
import { resolveChrome } from '../../features/content/chromePositioning'
import '../../styles/chrome-positioning.css'
import { NotificationBell } from '../notifications/NotificationBell'

interface AppHeaderProps {
  categories: Category[]
  products: Product[]
  preview?: boolean
  scenario?: string
  unread?: number
  loading?: boolean
  error?: boolean
}

function resolveHeader(pathname: string, categories: Category[], products: Product[]) {
  const categoryId = pathname.match(/^\/categories\/([^/]+)/)?.[1]
  const productId = pathname.match(/^\/products\/([^/]+)/)?.[1]
  const ticketDetail = pathname.match(/^\/tickets\/([^/]+)/)?.[1]
  const isNewTicket = ticketDetail === 'new'
  const isTicketDetail = Boolean(ticketDetail)
  const category = categories.find((item) => item.id === categoryId)
  const product = products.find((item) => item.id === productId)

  const accountDetail = pathname.startsWith('/orders') || pathname.startsWith('/downloads') || pathname.startsWith('/notifications')
  const header = pathname.startsWith('/notifications') ? { title: 'اعلان‌ها', icon: 'bell' as IconName }
    : pathname.startsWith('/orders') ? { title: 'سفارش‌ها', icon: 'orders' as IconName }
    : pathname.startsWith('/downloads') ? { title: 'دانلودها', icon: 'download' as IconName }
      : pathname.startsWith('/wallet') ? { title: 'کیف پول', icon: 'wallet' as IconName }
      : pathname.startsWith('/vip') ? { title: 'پلن‌های VIP', icon: 'crown' as IconName }
      : isNewTicket ? { title: 'تیکت جدید', icon: 'plus' as IconName }
        : isTicketDetail ? { title: 'گفت‌وگوی پشتیبانی', icon: 'tickets' as IconName }
          : pathname.startsWith('/tickets') ? { title: 'تیکت‌ها', icon: 'tickets' as IconName }
        : pathname.startsWith('/profile') ? { title: 'پروفایل', icon: 'profile' as IconName }
          : categoryId ? { title: category?.title || 'دسته‌بندی', icon: 'box' as IconName }
            : productId ? { title: product?.title || 'جزئیات محصول', icon: 'shop' as IconName }
              : { title: 'فروشگاه', icon: 'shop' as IconName }

  return {
    ...header,
    isDetail: Boolean(categoryId || productId || isTicketDetail || accountDetail),
    isTicketDetail,
    showSearch: pathname === '/',
  }
}

export function AppHeader({ categories, products, preview = false, scenario = 'content', unread = 0, loading = false, error = false }: AppHeaderProps) {
  const { headerSettings: settings } = useContent()
  const navigate = useNavigate()
  const location = useLocation()
  const simulateMissing = preview && scenario === 'not-found'
  const header = resolveHeader(location.pathname, simulateMissing ? [] : categories, simulateMissing ? [] : products)
  const independent = settings.positioning !== undefined || settings.geometry !== undefined
  const appearance = resolveChrome('header', settings)
  const preset = independent ? undefined : headerLayoutPresets[settings.theme]
  const actions = visibleHeaderActions(settings, header.isDetail, header.showSearch)

  return (
    <header className="top-region chrome-host" data-header-theme={independent ? appearance.theme : settings.theme} data-header-layout={independent ? 'preset' : settings.layout} data-position={independent ? appearance.positioning : undefined} data-geometry={independent ? appearance.geometry : undefined} data-header-sticky={settings.sticky} data-structure={preset?.family} data-variant={preset?.variant} data-no-tools={!header.isDetail && actions.length === 0} style={{'--header-tool-count': Math.max(1,actions.length)} as CSSProperties}>
      <div className={`header-navigation chrome-header ${header.isDetail ? 'is-detail' : ''}`}>
        <div className="header-title-group chrome-brand">
          {settings.icons.title && <HeaderLogo src={settings.logo} icon={settings.iconNames?.title ?? header.icon} />}
          <div className="header-title-copy chrome-brand-copy"><h1 className="chrome-title">{header.title}</h1></div>
        </div>
        <div className="header-actions chrome-tools">
          {header.isDetail ? (
            <button className="header-back" onClick={() => header.isTicketDetail ? navigate('/tickets') : location.pathname === '/notifications' ? navigate('/') : navigate(-1)} aria-label="بازگشت">
              <span>بازگشت</span><Icon name={settings.iconNames?.back ?? 'back'} size={18} />
            </button>
          ) : (
            <>
              {actions.map(action => {
                const control = action === 'theme' ? <ThemeToggle lightIcon={settings.iconNames?.themeLight} darkIcon={settings.iconNames?.themeDark} caption={independent || !!preset} />
                  : action === 'notifications' ? <NotificationBell unread={preview ? 1 : unread} icon={settings.iconNames?.notifications} caption={independent || !!preset} />
                  : <ProductSearch products={products} loading={loading} error={error} icon={settings.iconNames?.search} caption={independent || !!preset} />
                return independent || preset ? <div className="chrome-tool" key={action}>{control}</div> : <span className="legacy-header-tool" key={action}>{control}</span>
              })}
            </>
          )}
        </div>
      </div>
    </header>
  )
}
