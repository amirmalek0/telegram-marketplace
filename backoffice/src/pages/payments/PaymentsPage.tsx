import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api';
import { PaymentResponse } from '@/types';
import { Badge, Button, DataTable, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, formatMoney, shortId } from '@/utils/format';

const paymentStatus = (value: string): { label: string; variant: 'success' | 'warning' | 'error' | 'default' } => ({
  paid: { label: 'موفق', variant: 'success' }, success: { label: 'موفق', variant: 'success' }, pending: { label: 'در انتظار', variant: 'warning' }, failed: { label: 'ناموفق', variant: 'error' },
}[value] as { label: string; variant: 'success' | 'warning' | 'error' | 'default' } || { label: value, variant: 'default' });

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentResponse[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await paymentsApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت تراکنش‌های پرداخت ناموفق بود'); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);
  const columns: Column<PaymentResponse>[] = [
    { key: 'id', title: 'شناسه پرداخت', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'order_id', title: 'سفارش', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'provider', title: 'درگاه', render: v => <span className="font-semibold">{String(v)}</span> },
    { key: 'gateway_trx_id', title: 'کد درگاه', render: v => <span className="mono-id">{String(v || '—')}</span> },
    { key: 'amount', title: 'مبلغ', render: v => <b>{formatMoney(Number(v))}</b> },
    { key: 'status', title: 'وضعیت', render: v => { const s = paymentStatus(String(v)); return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    { key: 'created_at', title: 'زمان', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
  ];
  const successTotal = rows.filter(x => ['paid', 'success'].includes(x.status)).reduce((s, x) => s + x.amount, 0);
  return <div><PageHeader eyebrow="FINANCE" title="پرداخت‌ها" description="رصد مستقل تراکنش‌های درگاه و تطبیق آن‌ها با سفارش‌ها" action={<Button variant="secondary" icon={<RefreshCw size={16} />} onClick={load}>به‌روزرسانی</Button>} /><div className="surface-card mb-4 flex items-center justify-between p-5"><div><p className="text-xs text-[rgb(var(--color-text-secondary))]">مجموع پرداخت موفق در این صفحه</p><p className="mt-1 text-2xl font-extrabold">{formatMoney(successTotal)}</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><CreditCard size={22} /></div></div><DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="تراکنشی برای نمایش وجود ندارد" /></div>;
}
