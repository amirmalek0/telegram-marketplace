import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpLeft, ShoppingBag, TicketPercent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ordersApi } from '@/api';
import type { OrderResponse, OrderStatus, OrdersSummary } from '@/types';
import { Badge } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import type { Column } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import { OrderCustomer } from './OrderCustomer';
import { OrderSummaryCards } from './OrderSummaryCards';
import './orders.css';

const statusMap: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  pending: { label: 'در انتظار', variant: 'warning' }, paid: { label: 'پرداخت‌شده', variant: 'success' },
  failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'برگشت‌خورده', variant: 'info' }, cancelled: { label: 'لغوشده', variant: 'default' },
};

export default function OrdersPage() {
  const [rows, setRows] = useState<OrderResponse[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError(false);
    try {
      const response = await ordersApi.list({ page, per_page: 20 });
      if (current !== request.current) return;
      setRows(response.data); setTotal(response.total); setSummary(response.summary);
    } catch { if (current === request.current) { setSummary(null); setError(true); } }
    finally { if (current === request.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  const columns: Column<OrderResponse>[] = [
    { key: 'id', title: 'شناسه سفارش', render: value => <CopyIdentifier value={String(value)} label="شناسه سفارش" /> },
    { key: 'user', title: 'خریدار', render: (_, order) => <OrderCustomer user={order.user} /> },
    { key: 'product_title', title: 'محصول', render: (_, order) => <div>
      <Link className="order-product" to={`/products/${order.product_id}/edit`}><span>{order.product_title || 'محصول بدون عنوان'}</span><ArrowUpLeft size={13} className="shrink-0" aria-hidden="true" /></Link>
      <span className="mt-1 block text-[10px] text-[rgb(var(--color-text-secondary))]">تعداد: {order.quantity.toLocaleString('fa-IR')}</span>
    </div> },
    { key: 'stars', title: 'مبلغ نهایی', render: (_, order) => <div className="flex flex-col items-start gap-1.5">
      <span className="finance-amount"><StarsAmount value={order.stars} /></span>
      {order.discount_stars > 0 && <del className="text-[10px] text-[rgb(var(--color-text-secondary))]" title="مبلغ پیش از تخفیف"><StarsAmount value={order.original_stars} /></del>}
    </div> },
    { key: 'coupon_code', title: 'کد تخفیف', render: (_, order) => order.coupon_code ? <div className="flex flex-col items-start gap-1.5">
      <span className="order-coupon"><TicketPercent size={14} aria-hidden="true" /><code dir="ltr">{order.coupon_code}</code></span>
      <span className="inline-flex items-center gap-1 text-[10px] text-[rgb(var(--color-text-secondary))]"><StarsAmount value={order.discount_stars} /> تخفیف</span>
    </div> : <span className="text-xs text-[rgb(var(--color-text-secondary))]">بدون کد</span> },
    { key: 'status', title: 'وضعیت', render: value => {
      const status = statusMap[value as OrderStatus] || { label: String(value), variant: 'default' as const };
      return <Badge variant={status.variant} dot>{status.label}</Badge>;
    } },
    { key: 'created_at', title: 'ثبت سفارش', render: value => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(value as string)}</span> },
  ];
  return <div className="finance-page">
    <CatalogHeader title="سفارش‌ها" icon={ShoppingBag} total={total} loading={loading} actions={null} />
    <OrderSummaryCards summary={summary} loading={loading} />
    <CatalogTable columns={columns} data={rows} loading={loading} error={error} onRefresh={() => void load()} keyExtractor={order => order.id}
      searchText={order => [order.id,order.user_id,order.product_id,order.product_title,order.coupon_code,order.user?.first_name,order.user?.last_name,order.user?.username,order.user?.telegram_id].filter(Boolean).join(' ')}
      filter={{ label: 'همه وضعیت‌ها', options: Object.entries(statusMap).map(([value, status]) => ({ value, label: status.label })), value: order => order.status }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز سفارشی ثبت نشده است" />
  </div>;
}
