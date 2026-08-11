import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Search, Sun } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';

const titles: Record<string, string> = {
  '/': 'داشبورد', '/products': 'محصولات', '/categories': 'دسته‌بندی‌ها', '/bundles': 'باندل‌ها', '/inventory': 'مخزن', '/files': 'فایل‌ها', '/messages': 'پیام‌های تحویل', '/apis': 'اتصال‌های API', '/orders': 'سفارش‌ها', '/payments': 'پرداخت‌ها', '/coupons': 'کدهای تخفیف', '/users': 'کاربران', '/wallets': 'کیف پول', '/vip': 'پلن‌های VIP', '/tickets': 'تیکت‌ها', '/admins': 'مدیران',
};

export function Header() {
  const { theme, toggleTheme, toggleMobileSidebar } = useUIStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const search = (event: FormEvent) => { event.preventDefault(); const q = query.trim().toLowerCase(); const hit = Object.entries(titles).find(([, value]) => value.toLowerCase().includes(q)); if (hit) { navigate(hit[0]); setQuery(''); } };
  return <header className="app-header">
    <div className="flex items-center gap-3"><button onClick={toggleMobileSidebar} className="icon-button lg:hidden" aria-label="باز کردن منو"><Menu size={19} /></button><div><p className="text-[11px] text-[rgb(var(--color-text-muted))]">مرکز عملیات</p><h2 className="text-base font-bold">{titles[pathname] || 'مدیریت'}</h2></div></div>
    <div className="flex items-center gap-2"><form onSubmit={search} className="hidden md:flex header-search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="رفتن به یک بخش..." /></form><div className="hidden items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 sm:flex dark:text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-500" />سامانه آنلاین</div><button onClick={toggleTheme} className="icon-button" aria-label="تغییر پوسته">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><div className="avatar">A</div></div>
  </header>;
}
