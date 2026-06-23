import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import ProductsPage from '@/pages/products/ProductsPage';
import FilesPage from '@/pages/files/FilesPage';
import MessagesPage from '@/pages/messages/MessagesPage';
import InventoryPage from '@/pages/inventory/InventoryPage';
import BundlesPage from '@/pages/bundles/BundlesPage';
import APIsPage from '@/pages/apis/APIsPage';
import AdminsPage from '@/pages/admins/AdminsPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';

// Suppress unused import warning for PageLoader (used in lazy loading scenarios)
void PageLoader;

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="rounded-2xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] p-10 text-center">
      <p className="text-lg font-semibold text-[rgb(var(--color-text))]">{name}</p>
      <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-2">
        این صفحه در فازهای بعدی پیاده‌سازی می‌شود.
      </p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { theme } = useUIStore();

  // Sync theme class on <html>
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={theme}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — wrapped in DashboardLayout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <DashboardLayout />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="bundles" element={<BundlesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="apis" element={<APIsPage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="orders" element={<PlaceholderPage name="سفارش‌ها" />} />
            <Route path="users" element={<PlaceholderPage name="کاربران" />} />
            <Route path="vip" element={<PlaceholderPage name="کاربران VIP" />} />
            <Route path="referrals" element={<PlaceholderPage name="ارجاعات" />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="broadcasts" element={<PlaceholderPage name="پخش همگانی" />} />
            <Route path="tickets" element={<PlaceholderPage name="تیکت‌ها" />} />
            <Route path="settings" element={<PlaceholderPage name="تنظیمات" />} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Estedad, system-ui, sans-serif',
            direction: 'rtl',
          },
        }}
      />
    </div>
  );
}

export default App;
