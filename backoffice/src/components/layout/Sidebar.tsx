import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bot, Boxes, ChevronLeft, CircleDollarSign, Code2, Crown, FileText,
  FolderTree, Layers3, LogOut, MessageSquareText, Package, ReceiptText,
  WalletCards, Smartphone, Settings, ShieldCheck, ShoppingBag, Ticket, Users, X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const groups = [
  { label: 'نمای کلی', items: [{ label: 'داشبورد', to: '/', icon: BarChart3 }] },
  { label: 'کاتالوگ', items: [
    { label: 'محصولات', to: '/products', icon: Package },
    { label: 'دسته‌بندی‌ها', to: '/categories', icon: FolderTree },
    { label: 'باندل‌ها', to: '/bundles', icon: Layers3 },
    { label: 'مخزن', to: '/inventory', icon: Boxes },
    { label: 'فایل‌ها', to: '/files', icon: FileText },
    { label: 'پیام‌های تحویل', to: '/messages', icon: MessageSquareText },
    { label: 'اتصال‌های API', to: '/apis', icon: Code2 },
  ]},
  { label: 'تجارت', items: [
    { label: 'سفارش‌ها', to: '/orders', icon: ShoppingBag },
    { label: 'پرداخت‌ها', to: '/payments', icon: ReceiptText },
    { label: 'کدهای تخفیف', to: '/coupons', icon: CircleDollarSign },
  ]},
  { label: 'مشتریان', items: [
    { label: 'کاربران', to: '/users', icon: Users },
    { label: 'کیف پول‌ها', to: '/wallets', icon: WalletCards },
    { label: 'پلن‌های VIP', to: '/vip', icon: Crown },
  ]},
  { label: 'پشتیبانی و سیستم', items: [
    { label: 'تیکت‌ها', to: '/tickets', icon: Ticket },
    { label: 'ویرایش مینی‌اپ', to: '/miniapp-content', icon: Smartphone },
    { label: 'مدیران', to: '/admins', icon: ShieldCheck },
    { label: 'تنظیمات عمومی', to: '/settings', icon: Settings },
  ]},
];

export function Sidebar() {
  const { sidebarCollapsed, mobileSidebarOpen, toggleSidebar, closeMobileSidebar } = useUIStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const signOut = () => { logout(); toast.success('از حساب کاربری خارج شدید'); navigate('/login'); };

  return <>
    {mobileSidebarOpen && <button aria-label="بستن منو" onClick={closeMobileSidebar} className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden" />}
    <button
      onClick={toggleSidebar}
      className={cn('icon-button fixed top-[19px] z-[70] hidden border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-md transition-[right] duration-200 lg:flex', sidebarCollapsed ? 'right-[57px]' : 'right-[253px]')}
      aria-label={sidebarCollapsed ? 'باز کردن منو' : 'جمع کردن منو'}
    >
      <ChevronLeft size={17} className={cn('transition-transform', sidebarCollapsed && 'rotate-180')} />
    </button>
    <aside className={cn('app-sidebar', sidebarCollapsed && 'is-collapsed', mobileSidebarOpen && 'is-mobile-open')}>
      <div className={cn('flex h-[76px] items-center gap-3 border-b border-[rgb(var(--color-border))] px-4', sidebarCollapsed && 'justify-center px-2')}>
        <div className="brand-mark"><Bot size={20} /></div>
        {!sidebarCollapsed && <div className="min-w-0 flex-1"><p className="truncate text-right text-sm font-extrabold tracking-tight">پنل مدیریت</p></div>}
        <button onClick={closeMobileSidebar} className="icon-button lg:hidden"><X size={18} /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(group => <div key={group.label} className="mb-5">
          {!sidebarCollapsed && <p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-[rgb(var(--color-text-muted))]">{group.label}</p>}
          <div className="space-y-1">{group.items.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={closeMobileSidebar} title={sidebarCollapsed ? item.label : undefined} className={({ isActive }) => cn('sidebar-link', isActive && 'is-active')}><item.icon size={18} />{!sidebarCollapsed && <span>{item.label}</span>}</NavLink>)}</div>
        </div>)}
      </nav>
      <div className="border-t border-[rgb(var(--color-border))] p-3"><button onClick={signOut} className="sidebar-link w-full text-rose-500 hover:!bg-rose-500/10"><LogOut size={18} />{!sidebarCollapsed && <span>خروج از حساب</span>}</button></div>
    </aside>
  </>;
}
