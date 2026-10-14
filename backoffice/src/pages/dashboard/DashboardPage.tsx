import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CircleDollarSign, Package, Search, ShoppingBag, Star, Ticket, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersApi, productsApi, ticketsApi, usersApi } from '@/api';
import { OrderResponse } from '@/types';
import { Badge } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';

interface Metric {
  label: string;
  value: number;
  helper: string;
  icon: React.ElementType;
  iconClass: string;
  path: string;
}

const container = { hidden: {}, visible: { transition: { staggerChildren: .05 } } };
const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const destinations = [
  { path: '/', label: 'داشبورد', keywords: 'خانه dashboard overview' },
  { path: '/products', label: 'محصولات', keywords: 'محصول کالا product catalog' },
  { path: '/categories', label: 'دسته‌بندی‌ها', keywords: 'دسته category' },
  { path: '/bundles', label: 'باندل', keywords: 'بسته bundle' },
  { path: '/inventory', label: 'مخزن', keywords: 'موجودی inventory stock' },
  { path: '/files', label: 'فایل', keywords: 'file download' },
  { path: '/messages', label: 'پیام تحویل', keywords: 'پیام delivery message' },
  { path: '/apis', label: 'اتصال API', keywords: 'api اتصال' },
  { path: '/orders', label: 'سفارش‌ها', keywords: 'سفارش order خرید' },
  { path: '/payments', label: 'پرداخت‌ها', keywords: 'پرداخت payment stars ستاره' },
  { path: '/coupons', label: 'کدهای تخفیف', keywords: 'تخفیف coupon discount' },
  { path: '/users', label: 'کاربران', keywords: 'کاربر مشتری user customer' },
  { path: '/vip', label: 'پلن‌های VIP', keywords: 'vip اشتراک plan' },
  { path: '/tickets', label: 'تیکت‌ها', keywords: 'ticket پشتیبانی support' },
  { path: '/admins', label: 'مدیران', keywords: 'admin مدیر' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ products: 0, users: 0, orders: 0, tickets: 0 });
  const [recent, setRecent] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return destinations.filter(destination => `${destination.label} ${destination.keywords}`.toLowerCase().includes(normalized)).slice(0, 6);
  }, [query]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      productsApi.list({ page: 1, per_page: 1 }),
      usersApi.list({ page: 1, per_page: 1 }),
      ordersApi.list({ page: 1, per_page: 6 }),
      ticketsApi.list({ page: 1, per_page: 1 }),
    ]).then(results => {
      if (!mounted) return;
      const value = <T,>(index: number) => results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<T>).value : null;
      const products = value<Awaited<ReturnType<typeof productsApi.list>>>(0);
      const users = value<Awaited<ReturnType<typeof usersApi.list>>>(1);
      const orders = value<Awaited<ReturnType<typeof ordersApi.list>>>(2);
      const tickets = value<Awaited<ReturnType<typeof ticketsApi.list>>>(3);
      setCounts({ products: products?.total || 0, users: users?.total || 0, orders: orders?.total || 0, tickets: tickets?.total || 0 });
      setRecent(orders?.data || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const metrics: Metric[] = [
    { label: 'کل سفارش‌ها', value: counts.orders, helper: 'چرخه کامل فروش', icon: ShoppingBag, iconClass: 'bg-blue-500/10 text-blue-600', path: '/orders' },
    { label: 'کاربران', value: counts.users, helper: 'مشتریان ثبت‌شده', icon: Users, iconClass: 'bg-violet-500/10 text-violet-600', path: '/users' },
    { label: 'محصولات', value: counts.products, helper: 'اقلام کاتالوگ', icon: Package, iconClass: 'bg-cyan-500/10 text-cyan-600', path: '/products' },
    { label: 'تیکت‌ها', value: counts.tickets, helper: 'در صف پشتیبانی', icon: Ticket, iconClass: 'bg-amber-500/10 text-amber-600', path: '/tickets' },
  ];

  const goTo = (path: string) => {
    navigate(path);
    setQuery('');
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    if (matches[0]) goTo(matches[0].path);
    else if (query.trim()) toast.error('بخشی با این عنوان پیدا نشد');
  };

  return <div className="space-y-6 pb-8">
    <section className="surface-card overflow-visible p-3">
      <form onSubmit={search} className="relative flex w-full items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5 transition focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/10">
        <Search size={16} className="shrink-0 text-[rgb(var(--color-text-muted))]" />
        <input value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[rgb(var(--color-text-muted))]" placeholder="جستجوی بخش‌های پنل..." />
        {query.trim() && <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1.5 shadow-xl">
          {matches.map(destination => <button key={destination.path} type="button" onClick={() => goTo(destination.path)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs font-semibold hover:bg-[rgb(var(--color-surface-2))]"><Search size={13} className="text-[rgb(var(--color-text-muted))]" />{destination.label}</button>)}
          {matches.length === 0 && <p className="px-3 py-3 text-center text-xs text-[rgb(var(--color-text-muted))]">نتیجه‌ای پیدا نشد</p>}
        </div>}
      </form>
      <div className="mt-3 flex items-center gap-4 border-t border-[rgb(var(--color-border))] pt-3">
        <div className="hidden shrink-0 border-l border-[rgb(var(--color-border))] px-3 sm:block">
          <p className="text-sm font-extrabold">میانبرها</p>
          <p className="mt-0.5 text-[10px] text-[rgb(var(--color-text-muted))]">دسترسی سریع</p>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <Quick path="/products" icon={<Package size={16} />} title="محصول جدید" />
          <Quick path="/payments" icon={<Star size={16} />} title="پرداخت‌های Stars" />
          <Quick path="/coupons" icon={<CircleDollarSign size={16} />} title="کد تخفیف" />
          <Quick path="/tickets" icon={<Ticket size={16} />} title="تیکت‌ها" />
        </div>
      </div>
    </section>

    <motion.section variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(metric => <motion.button variants={item} key={metric.path} onClick={() => navigate(metric.path)} className="surface-card metric-card text-right transition hover:-translate-y-0.5 hover:border-blue-500/30">
        <div className="mb-5 flex items-center justify-between"><span className={`grid h-10 w-10 place-items-center rounded-xl ${metric.iconClass}`}><metric.icon size={19} /></span><ArrowLeft size={15} className="text-[rgb(var(--color-text-muted))]" /></div>
        <p className="text-2xl font-black">{loading ? '—' : metric.value.toLocaleString('fa-IR')}</p>
        <p className="mt-1 text-xs font-semibold text-[rgb(var(--color-text-secondary))]">{metric.label}</p>
        <p className="mt-2 text-[10px] text-[rgb(var(--color-text-muted))]">{metric.helper}</p>
      </motion.button>)}
    </motion.section>

    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] p-5">
        <div><h2 className="font-extrabold">سفارش‌های اخیر</h2><p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">آخرین فعالیت‌های فروشگاه</p></div>
        <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-xs font-bold text-blue-600">همه سفارش‌ها <ArrowLeft size={14} /></button>
      </div>
      <div className="divide-y divide-[rgb(var(--color-border))]">
        {recent.map(order => <button key={order.id} onClick={() => navigate('/orders')} className="flex w-full items-center gap-4 p-4 text-right transition hover:bg-[rgb(var(--color-surface-2))]">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><ShoppingBag size={17} /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">سفارش #{shortId(order.id)}</p><p className="mt-1 text-[10px] text-[rgb(var(--color-text-muted))]">{formatDateTime(order.created_at)}</p></div>
          <b className="text-xs">{order.stars > 0 ? `${order.stars.toLocaleString('fa-IR')} ستاره` : '—'}</b>
          <OrderBadge status={order.status} />
        </button>)}
        {!loading && recent.length === 0 && <p className="p-10 text-center text-sm text-[rgb(var(--color-text-muted))]">هنوز سفارشی ثبت نشده است</p>}
      </div>
    </section>
  </div>;
}

function Quick({ path, icon, title }: { path: string; icon: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(path)} className="flex min-w-[145px] flex-1 items-center gap-2.5 rounded-xl border border-transparent bg-[rgb(var(--color-surface-2))] px-3 py-2.5 text-right transition hover:border-blue-500/25 hover:text-blue-600">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">{icon}</span>
    <b className="flex-1 whitespace-nowrap text-xs">{title}</b>
    <ArrowLeft size={13} className="text-[rgb(var(--color-text-muted))]" />
  </button>;
}

function OrderBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
    paid: { label: 'موفق', variant: 'success' },
    pending: { label: 'انتظار', variant: 'warning' },
    failed: { label: 'ناموفق', variant: 'error' },
    cancelled: { label: 'لغو', variant: 'default' },
  };
  const value = map[status] || { label: status, variant: 'default' as const };
  return <Badge variant={value.variant}>{value.label}</Badge>;
}
