import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg))]">
      <Sidebar />

      {/* Main content area — offset by sidebar width (260px expanded, 68px collapsed) */}
      <motion.div
        animate={{ marginRight: sidebarCollapsed ? 68 : 260 }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
        className="flex flex-col min-h-screen"
      >
        <Header />

        <main className="flex-1 p-6 max-w-screen-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>
    </div>
  );
}
