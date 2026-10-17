import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CircleDollarSign, Package, Search, ShoppingBag, Star, Ticket, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ordersApi, productsApi, ticketsApi, usersApi } from '@/api';
import type { OrderResponse, TicketResponse } from '@/types';
import { DashboardActivity } from './DashboardActivity';

import { DashboardMetricCard, type DashboardMetric } from './DashboardMetricCard';
import './dashboard.css';

const container = { hidden: {}, visible: { transition: { staggerChildren: .05 } } };

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
  const [recentTickets, setRecentTickets] = useState<TicketResponse[]>([]);
  const [activityErrors, setActivityErrors] = useState({ orders: false, tickets: false });
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
      ticketsApi.list({ page: 1, per_page: 6 }),
    ]).then(results => {
      if (!mounted) return;
      const value = <T,>(index: number) => results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<T>).value : null;
      const products = value<Awaited<ReturnType<typeof productsApi.list>>>(0);
      const users = value<Awaited<ReturnType<typeof usersApi.list>>>(1);
      const orders = value<Awaited<ReturnType<typeof ordersApi.list>>>(2);
      const tickets = value<Awaited<ReturnType<typeof ticketsApi.list>>>(3);
      setCounts({ products: products?.total || 0, users: users?.total || 0, orders: orders?.total || 0, tickets: tickets?.total || 0 });
      setRecent(orders?.data || []);
      setRecentTickets(tickets?.data || []);
      setActivityErrors({ orders: !orders, tickets: !tickets });
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const metrics: DashboardMetric[] = [
    { label: 'کل سفارش‌ها', value: counts.orders, icon: ShoppingBag, tone: 'blue', path: '/orders' },
    { label: 'کاربران', value: counts.users, icon: Users, tone: 'violet', path: '/users' },
    { label: 'محصولات', value: counts.products, icon: Package, tone: 'teal', path: '/products' },
    { label: 'تیکت‌ها', value: counts.tickets, icon: Ticket, tone: 'amber', path: '/tickets' },
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
    <section className="surface-card dashboard-shortcuts overflow-visible p-3">
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
          <h2 className="dashboard-shortcuts-title">میانبرها</h2>
        </div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          <Quick path="/products" icon={<Package size={16} />} title="محصول جدید" />
          <Quick path="/payments" icon={<Star size={16} />} title="پرداخت‌ها" />
          <Quick path="/coupons" icon={<CircleDollarSign size={16} />} title="کد تخفیف" />
          <Quick path="/tickets" icon={<Ticket size={16} />} title="تیکت‌ها" />
        </div>
      </div>
    </section>

    <motion.section variants={container} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(metric => <DashboardMetricCard key={metric.path} metric={metric} loading={loading} />)}
    </motion.section>

    <DashboardActivity orders={recent} tickets={recentTickets} loading={loading} ordersError={activityErrors.orders} ticketsError={activityErrors.tickets} />
  </div>;
}

function Quick({ path, icon, title }: { path: string; icon: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(path)} className="dashboard-quick">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600">{icon}</span>
    <b>{title}</b>
    <ArrowLeft size={13} className="text-[rgb(var(--color-text-muted))]" />
  </button>;
}
