import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';

const pageTitles: Record<string, string> = {
  '/': 'داشبورد',
  '/products': 'محصولات',
  '/categories': 'دسته‌بندی‌ها',
  '/bundles': 'باندل‌ها',
  '/inventory': 'موجودی',
  '/files': 'فایل‌ها',
  '/apis': 'API‌ها',
  '/orders': 'سفارش‌ها',
  '/users': 'کاربران',
  '/admins': 'مدیران',
  '/vip': 'کاربران VIP',
  '/referrals': 'ارجاعات',
  '/messages': 'پیام‌ها',
  '/broadcasts': 'پخش همگانی',
  '/tickets': 'تیکت‌ها',
  '/settings': 'تنظیمات',
};

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const location = useLocation();

  const title = pageTitles[location.pathname] ?? 'پنل مدیریت';

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))]">
      <Sidebar />

      {/* Main content area — offset by sidebar width */}
      <motion.div
        animate={{ marginRight: sidebarCollapsed ? 64 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex flex-col min-h-screen"
      >
        <Header title={title} />

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
}
