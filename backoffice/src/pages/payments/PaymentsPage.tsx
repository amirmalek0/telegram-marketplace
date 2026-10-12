import { useCallback, useEffect, useState } from 'react';
import { Check, FlaskConical, RefreshCw, Settings2, ShieldCheck, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api';
import { PaymentConfigResponse, PaymentResponse } from '@/types';
import { Badge, Button, ConfirmationModal, DataTable, Modal, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';

const paymentStatus = (value: string): { label: string; variant: 'success' | 'warning' | 'error' | 'default' } => ({
  succeeded: { label: 'موفق', variant: 'success' }, pending: { label: 'در انتظار', variant: 'warning' }, failed: { label: 'ناموفق', variant: 'error' }, refunded: { label: 'بازپرداخت‌شده', variant: 'default' },
}[value] as { label: string; variant: 'success' | 'warning' | 'error' | 'default' } || { label: value, variant: 'default' });

const paymentMethod = (method: string) => method === 'telegram_stars' ? 'Telegram Stars' : method;
const paymentAmount = (payment: PaymentResponse) => payment.currency === 'XTR'
  ? `${payment.amount_minor.toLocaleString('fa-IR')} ستاره`
  : `${payment.amount_minor.toLocaleString('fa-IR')} ${payment.currency}`;

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentResponse[]>([]); const [page, setPage] = useState(1); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);
  const load = useCallback(async () => { setLoading(true); try { const r = await paymentsApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت تراکنش‌های پرداخت ناموفق بود'); } finally { setLoading(false); } }, [page]);
  const loadConfig = useCallback(async () => { setConfigLoading(true); try { setConfig(await paymentsApi.getConfig()); } catch { toast.error('دریافت حالت پرداخت ناموفق بود'); } finally { setConfigLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadConfig(); }, [loadConfig]);
  const openModeModal = () => {
    if (!config) return;
    setSelectedMode(config.test_mode);
    setModeModalOpen(true);
  };
  const requestModeChange = () => {
    if (!config || selectedMode === config.test_mode) {
      setModeModalOpen(false);
      return;
    }
    setModeModalOpen(false);
    setPendingMode(selectedMode);
  };
  const updateMode = async () => {
    if (pendingMode === null || configSaving) return;
    setConfigSaving(true);
    try {
      const updated = await paymentsApi.updateConfig(pendingMode);
      setConfig(updated);
      toast.success(pendingMode ? 'حالت آزمایشی پرداخت فعال شد' : 'پرداخت واقعی Telegram Stars فعال شد');
      setPendingMode(null);
    } catch { toast.error('تغییر حالت پرداخت ناموفق بود'); }
    finally { setConfigSaving(false); }
  };
  const columns: Column<PaymentResponse>[] = [
    { key: 'id', title: 'شناسه پرداخت', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'order_id', title: 'سفارش', render: v => <span className="mono-id" title={v as string}>{shortId(v as string)}</span> },
    { key: 'method', title: 'روش پرداخت', render: v => <span className="font-semibold">{paymentMethod(String(v))}</span> },
    { key: 'external_transaction_id', title: 'شناسه تراکنش', render: v => <span className="mono-id" title={String(v || '')}>{v ? shortId(String(v)) : '—'}</span> },
    { key: 'amount_minor', title: 'مبلغ', render: (_v, row) => <b>{paymentAmount(row)}</b> },
    { key: 'is_test', title: 'حالت', render: v => <Badge variant={v ? 'warning' : 'success'}>{v ? 'آزمایشی' : 'واقعی'}</Badge> },
    { key: 'status', title: 'وضعیت', render: v => { const s = paymentStatus(String(v)); return <Badge variant={s.variant} dot>{s.label}</Badge>; } },
    { key: 'created_at', title: 'زمان', render: v => <span className="text-xs text-[rgb(var(--color-text-secondary))]">{formatDateTime(v as string)}</span> },
  ];
  const successTotal = rows.filter(x => !x.is_test && x.status === 'succeeded' && x.currency === 'XTR').reduce((sum, payment) => sum + payment.amount_minor, 0);
  const testMode = config?.test_mode ?? false;
  return <div>
    <PageHeader eyebrow="TELEGRAM STARS" title="پرداخت‌ها" description="تراکنش‌های Telegram Stars و تطبیق آن‌ها با سفارش‌ها" action={<div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" icon={<Settings2 size={15} />} disabled={configLoading || !config} onClick={openModeModal}>حالت پرداخت <Badge variant={testMode ? 'warning' : 'success'}>{testMode ? 'آزمایشی' : 'واقعی'}</Badge></Button><Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => { void load(); void loadConfig(); }}>به‌روزرسانی</Button></div>} />
    <div className="surface-card mb-4 flex items-center justify-between p-5"><div><p className="text-xs text-[rgb(var(--color-text-secondary))]">مجموع پرداخت واقعی موفق در این صفحه</p><p className="mt-1 text-2xl font-extrabold">{successTotal.toLocaleString('fa-IR')} ستاره</p></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500"><Star size={22} /></div></div>
    <DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="تراکنش Stars برای نمایش وجود ندارد" />
    <Modal
      isOpen={modeModalOpen}
      onClose={() => setModeModalOpen(false)}
      title="حالت پرداخت فروشگاه"
      description="حالت موردنظر برای خریدهای جدید را انتخاب کنید"
      size="sm"
      icon={<Settings2 size={18} />}
      footer={<><Button variant="secondary" onClick={() => setModeModalOpen(false)}>انصراف</Button><Button disabled={!config || selectedMode === config.test_mode} onClick={requestModeChange}>ادامه</Button></>}
    >
      <div className="space-y-3">
        <button type="button" onClick={() => setSelectedMode(false)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right transition-colors ${!selectedMode ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-2))]'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><ShieldCheck size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">پرداخت واقعی</span>{!selectedMode && <Check size={17} className="text-emerald-500" />}</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--color-text-secondary))]">فاکتور واقعی Telegram Stars ایجاد و مبلغ از کاربر دریافت می‌شود.</span></span>
        </button>
        <button type="button" onClick={() => setSelectedMode(true)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right transition-colors ${selectedMode ? 'border-amber-500/50 bg-amber-500/[0.06]' : 'border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-surface-2))]'}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500"><FlaskConical size={18} /></span>
          <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">پرداخت آزمایشی</span>{selectedMode && <Check size={17} className="text-amber-500" />}</span><span className="mt-1 block text-xs leading-5 text-[rgb(var(--color-text-secondary))]">خرید شبیه‌سازی می‌شود؛ هیچ Stars واقعی دریافت نخواهد شد.</span></span>
        </button>
      </div>
    </Modal>
    <ConfirmationModal
      isOpen={pendingMode !== null}
      onClose={() => !configSaving && setPendingMode(null)}
      onConfirm={() => void updateMode()}
      title={pendingMode ? 'فعال‌سازی پرداخت آزمایشی؟' : 'فعال‌سازی پرداخت واقعی؟'}
      message={pendingMode ? 'این تنظیم سراسری است. همه خریدهای جدید قابل شبیه‌سازی خواهند بود، محصول تحویل داده می‌شود و هیچ درآمد واقعی ایجاد نمی‌شود.' : 'همه خریدهای جدید فاکتور واقعی Telegram Stars باز می‌کنند و ممکن است از حساب کاربران مبلغ واقعی کسر شود.'}
      confirmText={pendingMode ? 'بله، حالت آزمایشی فعال شود' : 'بله، پرداخت واقعی فعال شود'}
      cancelText="بازگشت"
      loading={configSaving}
      variant="warning"
    />
  </div>;
}
