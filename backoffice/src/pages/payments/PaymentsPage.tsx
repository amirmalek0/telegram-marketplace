import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, Clock3, CreditCard, Star } from 'lucide-react';
import { paymentsApi } from '@/api';
import type { PaymentsSummary, TelegramStarsPaymentResponse } from '@/types';
import { Badge, Button } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { FinanceSummary } from '@/components/finance/FinanceSummary';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { formatDateTime } from '@/utils/format';
import { OrderCustomer } from '../orders/OrderCustomer';
import { PaymentDetails } from './PaymentDetails';
import { PaymentTarget } from './PaymentTarget';
import { paymentStatus, paymentStatuses, purposeLabels } from './paymentPresentation';
import '../orders/orders.css';

export default function PaymentsPage() {
  const [rows, setRows] = useState<TelegramStarsPaymentResponse[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [selected, setSelected] = useState<TelegramStarsPaymentResponse | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError(false);
    try {
      const result = await paymentsApi.list({ page, per_page: 20 });
      if (current !== request.current) return;
      setRows(result.data); setTotal(result.total); setSummary(result.summary);
      setSelected(previous => previous ? result.data.find(row => row.id === previous.id) || null : null);
    } catch { if (current === request.current) { setError(true); setSummary(null); } }
    finally { if (current === request.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const columns: Column<TelegramStarsPaymentResponse>[] = [
    { key: 'user', title: 'پرداخت‌کننده', render: (_, row) => <OrderCustomer user={row.user} /> },
    { key: 'target_title', title: 'بابت پرداخت', render: (_, row) => <PaymentTarget payment={row} /> },
    { key: 'stars', title: 'مبلغ / حالت', render: (_, row) => <div className="finance-stack"><span className="finance-amount"><StarsAmount value={row.stars} /></span><Badge variant={row.is_test ? 'warning' : 'default'}>{row.is_test ? 'آزمایشی' : 'واقعی'}</Badge></div> },
    { key: 'status', title: 'وضعیت', render: value => { const status = paymentStatus(String(value)); return <Badge variant={status.variant} dot>{status.label}</Badge>; } },
    { key: 'id', title: 'شناسه / زمان', render: (_, row) => <div className="finance-stack"><CopyIdentifier value={row.id} label="شناسه پرداخت" /><span className="finance-muted">{formatDateTime(row.created_at)}</span></div> },
    { key: 'actions', title: 'جزئیات', render: (_, row) => <Button size="sm" variant="ghost" onClick={() => setSelected(row)} aria-label={`جزئیات پرداخت ${row.id}`}>مشاهده <ArrowLeft size={14} /></Button> },
  ];
  return <div className="finance-page">
    <CatalogHeader title="پرداخت‌ها" icon={CreditCard} total={total} loading={loading} actions={<Badge variant="amber"><Star size={13} fill="currentColor" />Telegram Stars</Badge>} />
    <FinanceSummary label="آمار همه پرداخت‌ها" loading={loading} items={[
      { label: 'کل تراکنش‌ها', value: summary?.total, icon: CreditCard, tone: 'blue' },
      { label: 'پرداخت‌های موفق', value: summary?.succeeded, icon: CheckCheck, tone: 'green' },
      { label: 'در انتظار پرداخت', value: summary?.pending, icon: Clock3, tone: 'amber' },
      { label: 'مجموع موفقِ واقعی', value: summary?.paid_stars, icon: Star, tone: 'violet', stars: true, hint: 'بدون پرداخت‌های آزمایشی و بازپرداخت‌شده؛ در همه صفحات' },
    ]} />
    {!loading && summary && <div className="finance-notes" aria-label="آمار تکمیلی"><span>ناموفق: {summary.failed.toLocaleString('fa-IR')}</span><span>بازپرداخت‌شده: {summary.refunded.toLocaleString('fa-IR')}</span><span>آزمایشی: {summary.test_total.toLocaleString('fa-IR')}</span><small>تعداد تراکنش‌ها شامل واقعی و آزمایشی است.</small></div>}
    <CatalogTable columns={columns} data={rows} loading={loading} error={error} onRefresh={() => void load()} keyExtractor={row => row.id}
      searchText={row => [row.id,row.order_id,row.user_id,row.product_id,row.target_id,row.checkout_reference,row.external_transaction_id,row.provider_transaction_id,row.target_title,row.user?.first_name,row.user?.last_name,row.user?.username,row.user?.telegram_id,purposeLabels[row.purpose],row.is_test ? 'آزمایشی' : 'واقعی'].filter(Boolean).join(' ')}
      filter={{ label: 'همه وضعیت‌ها', options: Object.entries(paymentStatuses).map(([value, status]) => ({ value, label: status.label })), value: row => row.status }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز پرداختی ثبت نشده است" />
    <PaymentDetails payment={selected} onClose={() => setSelected(null)} />
  </div>;
}
