import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/api';
import { OrderResponse, OrderStatus } from '@/types';
import { Badge, Button, DataTable, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';

const statusMap: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  pending: { label: 'در انتظار', variant: 'warning' }, paid: { label: 'پرداخت‌شده', variant: 'success' },
  failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'برگشت‌خورده', variant: 'info' }, cancelled: { label: 'لغوشده', variant: 'default' },
};
export default function OrdersPage() {
  const [rows, setRows] = useState<OrderResponse[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await ordersApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت سفارش‌ها ناموفق بود'); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);
  const columns: Column<OrderResponse>[] = [
    { key: 'id', title: 'سفارش', render: v => <span className="mono-id" title={v as string}>#{shortId(v as string)}</span> },
    { key: 'user_id', title: 'کاربر', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'stars', title: 'مبلغ', render: v => <b>{Number(v) > 0 ? `${Number(v).toLocaleString('fa-IR')} ستاره` : '—'}</b> },
    { key: 'quantity', title: 'تعداد' },
    { key: 'status', title: 'وضعیت', render: v => <Badge variant={statusMap[v as OrderStatus].variant} dot>{statusMap[v as OrderStatus].label}</Badge> },
    { key: 'created_at', title: 'ثبت سفارش', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
  ];
  return <div><PageHeader eyebrow="TELEGRAM STARS" title="سفارش‌ها" description="پیگیری سفارش‌های Telegram Stars و وضعیت پرداخت آن‌ها" action={<Button variant="secondary" icon={<RefreshCw size={16} />} onClick={load}>به‌روزرسانی</Button>} /><div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary label="کل سفارش‌ها" value={total.toLocaleString('fa-IR')} icon={<ShoppingBag size={18} />} /><Summary label="در انتظار این صفحه" value={rows.filter(x => x.status === 'pending').length.toLocaleString('fa-IR')} /><Summary label="پرداخت‌شده این صفحه" value={rows.filter(x => x.status === 'paid').length.toLocaleString('fa-IR')} /><Summary label="Stars موفق این صفحه" value={`${rows.filter(x => x.status === 'paid').reduce((sum, order) => sum + order.stars, 0).toLocaleString('fa-IR')} ستاره`} /></div><DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز سفارشی ثبت نشده است" /></div>;
}
function Summary({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="surface-card p-4"><div className="mb-2 flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))]"><span>{label}</span>{icon}</div><p className="text-lg font-extrabold">{value}</p></div>; }
