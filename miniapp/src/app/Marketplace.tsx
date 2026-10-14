import { Navigate, Route, Routes } from 'react-router-dom'
import { TelegramRequired } from '../components/feedback/TelegramRequired'
import { AppHeader } from '../components/layout/AppHeader'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { useCatalog } from '../features/catalog/useCatalog'
import { useTelegramAuth, type UseTelegramAuthResult } from '../hooks/useTelegramAuth'
import { usePhoneAccess } from '../features/auth/usePhoneAccess'
import { PhoneVerificationGate } from '../components/feedback/PhoneVerificationGate'
import { CategoryPage } from '../pages/CategoryPage'
import { NewTicketPage } from '../pages/NewTicketPage'
import { ProductPage } from '../pages/ProductPage'
import { OrdersPage } from '../pages/OrdersPage'
import { DownloadsPage } from '../pages/DownloadsPage'
import { ShopPage } from '../pages/ShopPage'
import { TicketPage } from '../pages/TicketPage'
import { TicketsPage } from '../pages/TicketsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { useContent } from '../features/content/ContentProvider'

export function Marketplace() {
  const auth = useTelegramAuth()
  const content = useContent()
  const phone = usePhoneAccess(auth.initDataRaw, content.editorMode)

  if ((!auth.isAvailable || !auth.user || !auth.initDataRaw) && !content.editorMode) return <TelegramRequired />
  if (!content.editorReady) return <main className="standalone-state content-editor-wait" dir="rtl"><span className="skeleton" /><p>در حال اتصال به پنل مدیریت…</p></main>
  if (content.editorMode && content.editorScenario.startsWith('phone-')) return <PhoneVerificationGate key={content.editorScenario} loading={content.editorScenario === 'phone-loading'} error={content.editorScenario === 'phone-error' ? 'بررسی دسترسی ممکن نشد. اتصال خود را بررسی و دوباره تلاش کنید.' : null} preview={content.editorScenario} onRefresh={() => {}} />
  if (!phone.allowed) return <PhoneVerificationGate loading={phone.loading} error={phone.error} onRefresh={phone.refresh} />
  return <MarketplaceContent auth={auth} />
}

function MarketplaceContent({ auth }: { auth: UseTelegramAuthResult }) {
  const content = useContent()
  const catalog = useCatalog(auth.user, auth.initDataRaw, content.adminToken)

  return (
    <div className="app-shell">
      <ScrollToTop />
      <AppHeader categories={catalog.categories} products={catalog.products} preview={content.editorMode} scenario={content.editorScenario} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<ShopPage {...catalog} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/categories/:categoryId" element={<CategoryPage {...catalog} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/products/:productId" element={<ProductPage {...catalog} initDataRaw={auth.initDataRaw} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/orders" element={<OrdersPage initDataRaw={auth.initDataRaw} products={catalog.products} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/downloads" element={<DownloadsPage initDataRaw={auth.initDataRaw} products={catalog.products} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/wallet" element={<ProfilePage initDataRaw={auth.initDataRaw} telegramUser={auth.user} preview={content.editorMode} scenario={content.editorScenario} view="wallet" />} />
          <Route path="/vip" element={<ProfilePage initDataRaw={auth.initDataRaw} telegramUser={auth.user} preview={content.editorMode} scenario={content.editorScenario} view="vip" />} />
          <Route path="/tickets" element={<TicketsPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/tickets/new" element={<NewTicketPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/tickets/:ticketId" element={<TicketPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} preview={content.editorMode} scenario={content.editorScenario} />} />
          <Route path="/profile" element={<ProfilePage initDataRaw={auth.initDataRaw} telegramUser={auth.user} preview={content.editorMode} scenario={content.editorScenario} view="profile" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}
