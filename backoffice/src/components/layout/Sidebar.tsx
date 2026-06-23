import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Tag,
  Layers,
  ShoppingCart,
  Users,
  Shield,
  MessageSquare,
  Megaphone,
  Settings,
  LogOut,
  ChevronRight,
  Boxes,
  FileText,
  Zap,
  Star,
  Ticket,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'داشبورد',
    items: [
      { label: 'خلاصه', icon: <LayoutDashboard size={18} />, to: '/' },
    ],
  },
  {
    title: 'کاتالوگ',
    items: [
      { label: 'محصولات', icon: <Package size={18} />, to: '/products' },
      { label: 'دسته‌بندی‌ها', icon: <Tag size={18} />, to: '/categories' },
      { label: 'باندل‌ها', icon: <Layers size={18} />, to: '/bundles' },
      { label: 'موجودی', icon: <Boxes size={18} />, to: '/inventory' },
      { label: 'فایل‌ها', icon: <FileText size={18} />, to: '/files' },
      { label: 'API‌ها', icon: <Zap size={18} />, to: '/apis' },
    ],
  },
  {
    title: 'تجارت',
    items: [
      { label: 'سفارش‌ها', icon: <ShoppingCart size={18} />, to: '/orders' },
    ],
  },
  {
    title: 'کاربران',
    items: [
      { label: 'کاربران', icon: <Users size={18} />, to: '/users' },
      { label: 'مدیران', icon: <Shield size={18} />, to: '/admins' },
      { label: 'VIP', icon: <Star size={18} />, to: '/vip' },
      { label: 'ارجاعات', icon: <GitBranch size={18} />, to: '/referrals' },
    ],
  },
  {
    title: 'ارتباطات',
    items: [
      { label: 'پیام‌ها', icon: <MessageSquare size={18} />, to: '/messages' },
      { label: 'پخش همگانی', icon: <Megaphone size={18} />, to: '/broadcasts' },
      { label: 'تیکت‌ها', icon: <Ticket size={18} />, to: '/tickets' },
    ],
  },
  {
    title: 'سیستم',
    items: [
      { label: 'تنظیمات', icon: <Settings size={18} />, to: '/settings' },
    ],
  },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('با موفقیت خارج شدید');
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full z-40 flex flex-col bg-[rgb(var(--color-surface))] border-l border-[rgb(var(--color-border))] overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[rgb(var(--color-border))] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[#0088cc] flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="mr-3 overflow-hidden whitespace-nowrap"
            >
              <p className="text-sm font-bold text-[rgb(var(--color-text))]">پنل مدیریت</p>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">Marketplace</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1 text-xs font-semibold text-[rgb(var(--color-text-secondary))] uppercase tracking-wider"
                >
                  {group.title}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 group relative',
                    isActive
                      ? 'bg-[#0088cc]/10 text-[#0088cc] font-medium'
                      : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg))] hover:text-[rgb(var(--color-text))]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('flex-shrink-0', isActive && 'text-[#0088cc]')}>
                      {item.icon}
                    </span>
                    <AnimatePresence>
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#0088cc] rounded-l-full"
                      />
                    )}
                    {/* Tooltip when collapsed */}
                    {sidebarCollapsed && (
                      <div className="absolute right-full mr-2 px-2 py-1 bg-[rgb(var(--color-text))] text-[rgb(var(--color-bg))] text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {item.label}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-2 border-t border-[rgb(var(--color-border))]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors group relative"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -5 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap"
              >
                خروج
              </motion.span>
            )}
          </AnimatePresence>
          {sidebarCollapsed && (
            <div className="absolute right-full mr-2 px-2 py-1 bg-[rgb(var(--color-text))] text-[rgb(var(--color-bg))] text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              خروج
            </div>
          )}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] flex items-center justify-center shadow-sm hover:bg-[rgb(var(--color-bg))] transition-colors z-50"
      >
        <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={12} className="text-[rgb(var(--color-text-secondary))]" />
        </motion.div>
      </button>
    </motion.aside>
  );
}
