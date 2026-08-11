import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/api';
import { OrderResponse, OrderStatus } from '@/types';
import { Badge, Button, DataTable, PageHeader, Select } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, formatMoney, shortId } from '@/utils/format';

const statusMap: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'error' | 'info' | 'default' }> = {
  pending: { label: 'در انتظار', variant: 'warning' }, paid: { label: 'پرداخت‌شده', variant: 'success' },
  failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'برگشت‌خورده', variant: 'info' }, cancelled: { label: 'لغوشده', variant: 'default' },
};
const statusOptions = Object.entries(statusMap).map(([value, item]) => ({ value, label: item.label }));

export default function OrdersPage() {
  const [rows, setRows] = useState<OrderResponse[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState('');
  const load = useCallback(async () => { setLoading(true); try { const r = await ordersApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت سفارش‌ها ناموفق بود'); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);
  const changeStatus = async (row: OrderResponse, status: OrderStatus) => { if (status === row.status) return; setUpdating(row.id); try { await ordersApi.updateStatus(row.id, status); setRows(v => v.map(x => x.id === row.id ? { ...x, status } : x)); toast.success('وضعیت سفارش به‌روز شد'); } catch { toast.error('تغییر وضعیت سفارش ناموفق بود'); } finally { setUpdating(''); } };
  const columns: Column<OrderResponse>[] = [
    { key: 'id', title: 'سفارش', render: v => <span className="mono-id" title={v as string}>#{shortId(v as string)}</span> },
    { key: 'user_id', title: 'کاربر', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'amount', title: 'مبلغ نهایی', render: (v, r) => <div><b>{formatMoney(Number(v) - r.discount_amount)}</b>{r.discount_amount > 0 && <p className="text-[10px] text-emerald-600">{formatMoney(r.discount_amount)} تخفیف</p>}</div> },
    { key: 'quantity', title: 'تعداد' },
    { key: 'status', title: 'وضعیت', render: v => <Badge variant={statusMap[v as OrderStatus].variant} dot>{statusMap[v as OrderStatus].label}</Badge> },
    { key: 'created_at', title: 'ثبت سفارش', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
    { key: 'actions', title: 'تغییر وضعیت', render: (_, row) => <Select aria-label="وضعیت سفارش" disabled={updating === row.id} value={row.status} options={statusOptions} onChange={e => changeStatus(row, e.target.value as OrderStatus)} className="min-w-36 !py-2" /> },
  ];
  return <div><PageHeader eyebrow="COMMERCE" title="سفارش‌ها" description="پیگیری سفارش‌ها، مبالغ و چرخه وضعیت از یک نمای واحد" action={<Button variant="secondary" icon={<RefreshCw size={16} />} onClick={load}>به‌روزرسانی</Button>} /><div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary label="کل سفارش‌ها" value={total.toLocaleString('fa-IR')} icon={<ShoppingBag size={18} />} /><Summary label="در انتظار این صفحه" value={rows.filter(x => x.status === 'pending').length.toLocaleString('fa-IR')} /><Summary label="پرداخت‌شده این صفحه" value={rows.filter(x => x.status === 'paid').length.toLocaleString('fa-IR')} /><Summary label="فروش این صفحه" value={formatMoney(rows.filter(x => x.status === 'paid').reduce((s, x) => s + x.amount - x.discount_amount, 0))} /></div><DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز سفارشی ثبت نشده است" /></div>;
}
function Summary({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="surface-card p-4"><div className="mb-2 flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))]"><span>{label}</span>{icon}</div><p className="text-lg font-extrabold">{value}</p></div>; }
