import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useNotifications } from '../features/notifications/useNotifications'
import { TelegramRequired } from '../components/feedback/TelegramRequired'
import { AppHeader } from '../components/layout/AppHeader'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { useCatalog } from '../features/catalog/useCatalog'
import { useTelegramAuth, type UseTelegramAuthResult } from '../hooks/useTelegramAuth'
import { usePhoneAccess } from '../features/auth/usePhoneAccess'
import { PhoneVerificationGate } from '../components/feedback/PhoneVerificationGate'
import { useContent } from '../features/content/ContentProvider'
import { PageComposer } from '../components/editor/PageComposer'
import { pageForPath, pageIds, type PageId } from '../features/content/pageLayouts'

const routes: { path: string; page: PageId }[] = [
  { path: '/', page: 'shop' }, { path: '/profile', page: 'profile' }, { path: '/wallet', page: 'wallet' },
  { path: '/vip', page: 'vip' }, { path: '/orders', page: 'orders' }, { path: '/downloads', page: 'downloads' },
  { path: '/tickets', page: 'tickets' }, { path: '/notifications', page: 'notifications' },
  { path: '/products/:productId', page: 'product' }, { path: '/categories/:categoryId', page: 'category' },
  { path: '/tickets/new', page: 'new-ticket' }, { path: '/tickets/:ticketId', page: 'ticket' },
]

export function Marketplace() {
  const auth = useTelegramAuth()
  const content = useContent()
  const phone = usePhoneAccess(auth.initDataRaw, content.editorMode)

  if ((!auth.isAvailable || !auth.user || !auth.initDataRaw) && !content.editorMode) return <TelegramRequired />
  if (!content.editorReady) return <main className="standalone-state content-editor-wait" dir="rtl"><span className="skeleton" /><p>در حال اتصال به پنل مدیریت…</p></main>
  if (!phone.allowed) return <PhoneVerificationGate loading={phone.loading} error={phone.error} onRefresh={phone.refresh} />
  return <MarketplaceContent auth={auth} />
}

function MarketplaceContent({ auth }: { auth: UseTelegramAuthResult }) {
  const content = useContent()
  const location = useLocation()
  const navigate = useNavigate()
  const notificationSectionVisible = content.layoutForPage(pageForPath(location.pathname)).sections.some(section => section.type === 'notifications.feed' && section.visible)
  const notifications = useNotifications(auth.initDataRaw, notificationSectionVisible, content.editorMode)
  const catalog = useCatalog(auth.user, auth.initDataRaw, content.adminToken)
  useEffect(() => {
    if (!content.editorMode) return
    const host = window.opener && !window.opener.closed ? window.opener : window.parent
    const origin = new URLSearchParams(window.location.search).get('editor-origin') || document.referrer
    if (!origin) return
    let trustedOrigin: string
    try { trustedOrigin = new URL(origin).origin } catch { return }
    const receive = (event: MessageEvent) => {
      if (event.source !== host || event.origin !== trustedOrigin || event.data?.type !== 'miniapp-editor-navigate-page' || !pageIds.includes(event.data.page)) return
      const page = event.data.page as PageId
      if (pageForPath(location.pathname) === page) return
      const path = page === 'shop' ? '/' : page === 'product' ? `/products/${catalog.products[0]?.id || 'preview-product'}`
        : page === 'category' ? `/categories/${catalog.categories[0]?.id || 'preview-category'}`
        : page === 'ticket' ? '/tickets/preview-ticket-open' : page === 'new-ticket' ? '/tickets/new' : '/' + page
      navigate(path)
      window.scrollTo(0, 0)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [content.editorMode, catalog.products, catalog.categories, location.pathname, navigate])

  // Keep the editor navigation receiver mounted even while previewing the gate.
  // Real phone authorization is still enforced above, outside the page composer.
  if (content.editorMode && content.editorScenario.startsWith('phone-')) return <PhoneVerificationGate key={content.editorScenario} loading={content.editorScenario === 'phone-loading'} error={content.editorScenario === 'phone-error' ? 'بررسی دسترسی ممکن نشد. اتصال خود را بررسی و دوباره تلاش کنید.' : null} preview={content.editorScenario} onRefresh={() => {}} />

  return (
    <div className="app-shell">
      <ScrollToTop />
      <AppHeader categories={catalog.categories} products={catalog.products} preview={content.editorMode} scenario={content.editorScenario} unread={notifications.unread} />
      <main className="app-content">
        <Routes>
          {routes.map(route => <Route key={route.path} path={route.path} element={<PageComposer key={location.pathname} environment={{ catalog, auth, notifications, page: route.page, preview: content.editorMode, scenario: content.editorScenario }} />} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}
