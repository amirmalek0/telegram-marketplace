import { Navigate, Route, Routes } from 'react-router-dom'
import { TelegramRequired } from '../components/feedback/TelegramRequired'
import { AppHeader } from '../components/layout/AppHeader'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { useCatalog } from '../features/catalog/useCatalog'
import { useTelegramAuth } from '../hooks/useTelegramAuth'
import { CategoryPage } from '../pages/CategoryPage'
import { ProductPage } from '../pages/ProductPage'
import { ShopPage } from '../pages/ShopPage'
import { UnderConstructionPage } from '../pages/UnderConstructionPage'

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
          <Route path="/orders" element={<UnderConstructionPage icon="orders" title="سفارش‌ها" />} />
          <Route path="/downloads" element={<UnderConstructionPage icon="download" title="دانلودها" />} />
          <Route path="/tickets" element={<UnderConstructionPage icon="tickets" title="تیکت‌ها" />} />
          <Route path="/profile" element={<UnderConstructionPage icon="profile" title="پروفایل" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}
