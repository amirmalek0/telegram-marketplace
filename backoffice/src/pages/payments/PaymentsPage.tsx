import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api';
import { TelegramStarsPaymentResponse } from '@/types';
import { Badge, Button, DataTable, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';

const paymentStatus = (value: string): { label: string; variant: 'success' | 'warning' | 'error' | 'default' } => ({
  succeeded: { label: 'موفق', variant: 'success' }, pending: { label: 'در انتظار', variant: 'warning' }, failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'بازپرداخت‌شده', variant: 'default' },
}[value] as { label: string; variant: 'success' | 'warning' | 'error' | 'default' } || { label: value, variant: 'default' });

const purposeLabel: Record<string, string> = { product: 'محصول', vip_plan: 'اشتراک VIP', wallet_topup: 'شارژ کیف پول' };

export default function PaymentsPage() {
  const [rows, setRows] = useState<TelegramStarsPaymentResponse[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const r = await paymentsApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت تراکنش‌های پرداخت ناموفق بود'); } finally { setLoading(false); } }, [page]);
  useEffect(() => { void load(); }, [load]);
  const columns: Column<TelegramStarsPaymentResponse>[] = [
    { key: 'id', title: 'شناسه پرداخت', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'purpose', title: 'بابت', render: v => <Badge variant={v === 'wallet_topup' ? 'cyan' : v === 'vip_plan' ? 'purple' : 'info'}>{purposeLabel[String(v)] || String(v)}</Badge> },
    { key: 'order_id', title: 'سفارش', render: v => v ? <span className="mono-id" title={String(v)}>{shortId(String(v))}</span> : <span>—</span> },
    { key: 'external_transaction_id', title: 'شناسه تراکنش', render: v => <span className="mono-id" title={String(v || '')}>{v ? shortId(String(v)) : '—'}</span> },
    { key: 'stars', title: 'مبلغ', render: v => <b>{Number(v).toLocaleString('fa-IR')} ستاره</b> },
    { key: 'is_test', title: 'حالت', render: v => <Badge variant={v ? 'warning' : 'success'}>{v ? 'آزمایشی' : 'واقعی'}</Badge> },
    { key: 'status', title: 'وضعیت', render: v => { const s = paymentStatus(String(v)); return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    { key: 'created_at', title: 'زمان', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
  ];
  const successTotal = rows.filter(x => !x.is_test && x.status === 'succeeded').reduce((sum, payment) => sum + payment.stars, 0);
  return <div>
    <PageHeader title="پرداخت‌ها" action={<Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => void load()}>به‌روزرسانی</Button>} />
    <div className="surface-card mb-4 flex items-center justify-between p-5"><div><p className="text-xs text-[rgb(var(--color-text-secondary))]">مجموع پرداخت واقعی موفق در این صفحه</p><p className="mt-1 text-2xl font-extrabold">{successTotal.toLocaleString('fa-IR')} ستاره</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><Star size={22} /></div></div>
    <DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="تراکنش Stars برای نمایش وجود ندارد" />
  </div>;
}
