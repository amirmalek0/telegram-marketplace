import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();

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
          <Outlet />
        </main>
      </motion.div>
    </div>
  );
}
