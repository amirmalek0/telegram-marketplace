import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  ChevronLeft,
  ChevronDown,
  Boxes,
  FileText,
  Zap,
  Star,
  Ticket,
  GitBranch,
  Bot,
  CornerDownLeft,
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
  subItems?: SubNavItem[];
}

interface SubNavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: NavItem[];
}

const productSubItems: SubNavItem[] = [
  { label: 'مخزن', icon: <Boxes size={13} />, to: '/inventory' },
  { label: 'فایل‌ها', icon: <FileText size={13} />, to: '/files' },
  { label: 'باندل‌ها', icon: <Layers size={13} />, to: '/bundles' },
  { label: 'API‌ها', icon: <Zap size={13} />, to: '/apis' },
  { label: 'پیام‌ها', icon: <MessageSquare size={13} />, to: '/messages' },
];

const navGroups: NavGroup[] = [
  {
    id: 'main',
    title: 'اصلی',
    icon: <LayoutDashboard size={15} />,
    color: 'text-sky-500',
    items: [
      { label: 'داشبورد', icon: <LayoutDashboard size={16} />, to: '/' },
    ],
  },
  {
    id: 'catalog',
    title: 'فروشگاه',
    icon: <Package size={15} />,
    color: 'text-violet-500',
    items: [
      {
        label: 'محصولات',
        icon: <Package size={16} />,
        to: '/products',
        subItems: productSubItems,
      },
      { label: 'دسته‌بندی‌ها', icon: <Tag size={16} />, to: '/categories' },
    ],
  },
  {
    id: 'commerce',
    title: 'تجارت',
    icon: <ShoppingCart size={15} />,
    color: 'text-emerald-500',
    items: [
      { label: 'سفارش‌ها', icon: <ShoppingCart size={16} />, to: '/orders' },
    ],
  },
  {
    id: 'users',
    title: 'کاربران',
    icon: <Users size={15} />,
    color: 'text-amber-500',
    items: [
      { label: 'کاربران', icon: <Users size={16} />, to: '/users' },
      { label: 'مدیران', icon: <Shield size={16} />, to: '/admins' },
      { label: 'VIP', icon: <Star size={16} />, to: '/vip' },
      { label: 'ارجاعات', icon: <GitBranch size={16} />, to: '/referrals' },
    ],
  },
  {
    id: 'comms',
    title: 'ارتباطات',
    icon: <MessageSquare size={15} />,
    color: 'text-rose-500',
    items: [
      { label: 'پخش همگانی', icon: <Megaphone size={16} />, to: '/broadcasts' },
      { label: 'تیکت‌ها', icon: <Ticket size={16} />, to: '/tickets' },
    ],
  },
  {
    id: 'system',
    title: 'سیستم',
    icon: <Settings size={15} />,
    color: 'text-slate-400',
    items: [
      { label: 'تنظیمات', icon: <Settings size={16} />, to: '/settings' },
    ],
  },
];

const defaultOpen = new Set(['main', 'catalog', 'commerce', 'users', 'comms', 'system']);

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Set<string>>(defaultOpen);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    toast.success('با موفقیت خارج شدید');
    navigate('/login');
  };

  // Check if any sub-item is active (to highlight parent)
  const isSubItemActive = (subItems?: SubNavItem[]) =>
    subItems?.some((s) => location.pathname === s.to) ?? false;

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 260 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className="fixed top-0 right-0 h-full z-40 flex flex-col overflow-hidden select-none"
      style={{
        background: 'rgb(var(--color-surface))',
        borderLeft: '1px solid rgb(var(--color-border))',
      }}
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-16 px-3.5 flex-shrink-0 border-b border-[rgb(var(--color-border))]">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#00c6ff] flex items-center justify-center shadow-lg shadow-[#0088cc]/30">
            <Bot size={18} className="text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[rgb(var(--color-surface))] pulse-dot" />
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="mr-3 overflow-hidden whitespace-nowrap flex-1"
            >
              <p className="text-sm font-bold text-[rgb(var(--color-text))] leading-tight">پنل مدیریت</p>
              <p className="text-[11px] text-[rgb(var(--color-text-muted))]">ربات تلگرام</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={toggleSidebar}
          animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-2))] transition-colors flex-shrink-0"
        >
          <ChevronLeft size={14} />
        </motion.button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1">
        {navGroups.map((group) => {
          const isOpen = openGroups.has(group.id);

          return (
            <div key={group.id}>
              {/* Group header */}
              {!sidebarCollapsed ? (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex flex-row-reverse items-center gap-2 px-2 py-1.5 rounded-lg group transition-colors hover:bg-[rgb(var(--color-surface-2))]"
                >
                  <span className={cn('flex-shrink-0', group.color)}>{group.icon}</span>
                  <span className="flex-1 text-right text-[11px] font-bold uppercase tracking-widest text-[rgb(var(--color-text-secondary))] group-hover:text-[rgb(var(--color-text))] transition-colors">
                    {group.title}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 0 : -90 }}
                    transition={{ duration: 0.2 }}
                    className="text-[rgb(var(--color-text-muted))]"
                  >
                    <ChevronDown size={13} />
                  </motion.span>
                </button>
              ) : (
                <div className="flex items-center justify-center py-1.5">
                  <div className={cn('w-1.5 h-1.5 rounded-full', group.color.replace('text-', 'bg-'))} />
                </div>
              )}

              {/* Group items */}
              <AnimatePresence initial={false}>
                {(isOpen || sidebarCollapsed) && (
                  <motion.div
                    key={group.id + '-items'}
                    initial={sidebarCollapsed ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className={cn(
                      'space-y-0.5',
                      !sidebarCollapsed && 'pr-2 border-r-2 border-[rgb(var(--color-border))] mr-2 mb-1'
                    )}>
                      {group.items.map((item) => {
                        const hasSubItems = item.subItems && item.subItems.length > 0;
                        const subActive = isSubItemActive(item.subItems);

                        return (
                          <div key={item.to}>
                            {/* Main nav item */}
                            <NavLink
                              to={item.to}
                              end={item.to === '/'}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all duration-150 relative group',
                                  (isActive || subActive)
                                    ? 'bg-[#0088cc]/10 text-[#0088cc] font-semibold'
                                    : 'text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-2))] hover:text-[rgb(var(--color-text))]'
                                )
                              }
                            >
                              {({ isActive }) => {
                                const active = isActive || subActive;
                                return (
                                  <>
                                    {active && (
                                      <motion.div
                                        layoutId="sidebar-active-bg"
                                        className="absolute inset-0 rounded-xl bg-[#0088cc]/10"
                                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                                      />
                                    )}

                                    <span className={cn(
                                      'relative z-10 flex-shrink-0 transition-colors',
                                      active
                                        ? 'text-[#0088cc]'
                                        : 'text-[rgb(var(--color-text-muted))] group-hover:text-[rgb(var(--color-text-secondary))]'
                                    )}>
                                      {item.icon}
                                    </span>

                                    <AnimatePresence>
                                      {!sidebarCollapsed && (
                                        <motion.span
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 0.1 }}
                                          className="relative z-10 whitespace-nowrap overflow-hidden flex-1"
                                        >
                                          {item.label}
                                        </motion.span>
                                      )}
                                    </AnimatePresence>

                                    {active && sidebarCollapsed && (
                                      <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full bg-[#0088cc]" />
                                    )}

                                    {sidebarCollapsed && (
                                      <div className="absolute right-full mr-3 px-2.5 py-1.5 bg-[rgb(var(--color-text))] text-[rgb(var(--color-surface))] text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-50">
                                        {item.label}
                                        <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-[rgb(var(--color-text))] rotate-45" />
                                      </div>
                                    )}

                                    {item.badge && !sidebarCollapsed && (
                                      <span className="relative z-10 mr-auto bg-[#0088cc] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                        {item.badge}
                                      </span>
                                    )}
                                  </>
                                );
                              }}
                            </NavLink>

                            {/* Sub-items (always visible, non-collapsible) */}
                            {hasSubItems && !sidebarCollapsed && (
                              <div className="mr-4 mt-0.5 mb-1 space-y-0.5 border-r border-dashed border-[rgb(var(--color-border))] pr-2">
                                {item.subItems!.map((sub) => (
                                  <NavLink
                                    key={sub.to}
                                    to={sub.to}
                                    className={({ isActive }) =>
                                      cn(
                                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-all duration-150 relative group',
                                        isActive
                                          ? 'text-[#0088cc] font-medium bg-[#0088cc]/8'
                                          : 'text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-surface-2))]'
                                      )
                                    }
                                  >
                                    {({ isActive }) => (
                                      <>
                                        <CornerDownLeft
                                          size={10}
                                          className={cn(
                                            'flex-shrink-0 opacity-40',
                                            isActive && 'text-[#0088cc] opacity-70'
                                          )}
                                        />
                                        <span className={cn(
                                          'flex-shrink-0',
                                          isActive ? 'text-[#0088cc]' : 'text-[rgb(var(--color-text-muted))]'
                                        )}>
                                          {sub.icon}
                                        </span>
                                        <span className="whitespace-nowrap overflow-hidden">{sub.label}</span>
                                        {isActive && (
                                          <span className="mr-auto w-1.5 h-1.5 rounded-full bg-[#0088cc] flex-shrink-0" />
                                        )}
                                      </>
                                    )}
                                  </NavLink>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="flex-shrink-0 p-2 border-t border-[rgb(var(--color-border))]">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-[13px] transition-all duration-150',
            'text-[rgb(var(--color-text-secondary))] hover:bg-red-50 hover:text-red-500',
            'dark:hover:bg-red-900/20 dark:hover:text-red-400 group'
          )}
        >
          <LogOut
            size={16}
            className="flex-shrink-0 text-[rgb(var(--color-text-muted))] group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors"
          />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap"
              >
                خروج از حساب
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
