import { Navigate, Route, Routes } from 'react-router-dom'
import { TelegramRequired } from '../components/feedback/TelegramRequired'
import { AppHeader } from '../components/layout/AppHeader'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { useCatalog } from '../features/catalog/useCatalog'
import { useTelegramAuth } from '../hooks/useTelegramAuth'
import { CategoryPage } from '../pages/CategoryPage'
import { NewTicketPage } from '../pages/NewTicketPage'
import { ProductPage } from '../pages/ProductPage'
import { OrdersPage } from '../pages/OrdersPage'
import { DownloadsPage } from '../pages/DownloadsPage'
import { ShopPage } from '../pages/ShopPage'
import { TicketPage } from '../pages/TicketPage'
import { TicketsPage } from '../pages/TicketsPage'
import { ProfilePage } from '../pages/ProfilePage'

export function Marketplace() {
  const auth = useTelegramAuth()
  const catalog = useCatalog(auth.user, auth.initDataRaw)

  if (!auth.isAvailable) return <TelegramRequired />

  return (
    <div className="app-shell">
      <ScrollToTop />
      <AppHeader categories={catalog.categories} products={catalog.products} />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<ShopPage {...catalog} />} />
          <Route path="/categories/:categoryId" element={<CategoryPage {...catalog} />} />
          <Route path="/products/:productId" element={<ProductPage {...catalog} initDataRaw={auth.initDataRaw} />} />
          <Route path="/orders" element={<OrdersPage initDataRaw={auth.initDataRaw} products={catalog.products} />} />
          <Route path="/downloads" element={<DownloadsPage initDataRaw={auth.initDataRaw} />} />
          <Route path="/tickets" element={<TicketsPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} />} />
          <Route path="/tickets/new" element={<NewTicketPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} />} />
          <Route path="/tickets/:ticketId" element={<TicketPage initDataRaw={auth.initDataRaw} ready={!catalog.loading} />} />
          <Route path="/profile" element={<ProfilePage initDataRaw={auth.initDataRaw} telegramUser={auth.user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}
