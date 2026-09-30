import { useCallback, useEffect, useState } from 'react';
import { CreditCard, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api';
import { PaymentResponse } from '@/types';
import { Badge, Button, DataTable, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';

const paymentStatus = (value: string): { label: string; variant: 'success' | 'warning' | 'error' | 'default' } => ({
  succeeded: { label: 'موفق', variant: 'success' }, pending: { label: 'در انتظار', variant: 'warning' }, failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'بازپرداخت‌شده', variant: 'default' },
}[value] as { label: string; variant: 'success' | 'warning' | 'error' | 'default' } || { label: value, variant: 'default' });

const paymentMethod = (method: string) => method;
const paymentAmount = (payment: PaymentResponse) => `${payment.amount_minor.toLocaleString('fa-IR')} ${payment.currency}`;

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentResponse[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await paymentsApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت تراکنش‌های پرداخت ناموفق بود'); } finally { setLoading(false); } }, [page]);
  useEffect(() => { load(); }, [load]);
  const columns: Column<PaymentResponse>[] = [
    { key: 'id', title: 'شناسه پرداخت', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'order_id', title: 'سفارش', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'method', title: 'روش پرداخت', render: v => <span className="font-semibold">{paymentMethod(String(v))}</span> },
    { key: 'external_transaction_id', title: 'شناسه تراکنش', render: v => <span className="mono-id" title={String(v || '')}>{v ? shortId(String(v)) : '—'}</span> },
    { key: 'amount_minor', title: 'مبلغ', render: (_v, row) => <b>{paymentAmount(row)}</b> },
    { key: 'status', title: 'وضعیت', render: v => { const s = paymentStatus(String(v)); return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    { key: 'created_at', title: 'زمان', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
  ];
  const successfulCount = rows.filter(x => x.status === 'succeeded').length;
  return <div><PageHeader eyebrow="FINANCE" title="پرداخت‌ها" description="رصد تراکنش‌ها و تطبیق آن‌ها با سفارش‌ها" action={<Button variant="secondary" icon={<RefreshCw size={16} />} onClick={load}>به‌روزرسانی</Button>} /><div className="surface-card mb-4 flex items-center justify-between p-5"><div><p className="text-xs text-[rgb(var(--color-text-secondary))]">پرداخت‌های موفق در این صفحه</p><p className="mt-1 text-2xl font-extrabold">{successfulCount.toLocaleString('fa-IR')}</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><CreditCard size={22} /></div></div><DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="تراکنشی برای نمایش وجود ندارد" /></div>;
}
