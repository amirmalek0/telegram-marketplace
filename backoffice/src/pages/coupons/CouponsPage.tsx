import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { couponsApi } from '@/api';
import type { CouponResponse, CouponSummary as CouponSummaryData, CreateCouponRequest } from '@/types';
import { Badge, Button, ConfirmationModal, Toggle } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { formatDate } from '@/utils/format';
import { CouponSummary } from './CouponSummary';
import { CouponForm, CouponFormState, emptyCouponForm } from './CouponForm';

const states = {
  active: { label: 'فعال', variant: 'success' as const },
  inactive: { label: 'غیرفعال', variant: 'default' as const },
  expired: { label: 'منقضی‌شده', variant: 'warning' as const },
  exhausted: { label: 'ظرفیت تکمیل', variant: 'error' as const },
};
const couponState = (row: CouponResponse) => row.expires_at && Date.parse(row.expires_at) <= Date.now() ? 'expired' : !row.is_active ? 'inactive' : row.usage_limit > 0 && row.usage_count >= row.usage_limit ? 'exhausted' : 'active';

export default function CouponsPage() {
  const [summary, setSummary] = useState<CouponSummaryData | null>(null);
  const [rows, setRows] = useState<CouponResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyCouponForm);
  const [editing, setEditing] = useState<CouponResponse | null>(null);
  const [deleting, setDeleting] = useState<CouponResponse | null>(null);
  const [open, setOpen] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError(false);
    try {
      const result = await couponsApi.list({ page, per_page: 20 });
      if (current !== request.current) return;
      setRows(result.data); setTotal(result.total); setSummary(result.summary);
    } catch { if (current === request.current) { setSummary(null); setError(true); } }
    finally { if (current === request.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);

  const begin = (row?: CouponResponse) => {
    setEditing(row || null);
    setForm(row ? { code: row.code, discount_type: row.discount_type, discount_value: String(row.discount_value), usage_limit: String(row.usage_limit), expires_at: row.expires_at || '', product_ids: row.product_ids || [], user_ids: row.user_ids || [], user_scope: row.user_ids?.length ? 'selected' : 'all' } : emptyCouponForm);
    setOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (form.user_scope === 'selected' && !form.user_ids.length) return toast.error('حداقل یک کاربر انتخاب کنید');
    const payload: CreateCouponRequest = { code: form.code.trim(), discount_type: form.discount_type, discount_value: Number(form.discount_value), usage_limit: Number(form.usage_limit || 0), expires_at: form.expires_at, product_ids: form.product_ids, user_ids: form.user_scope === 'selected' ? form.user_ids : [] };
    if (!payload.code || !Number.isFinite(payload.discount_value) || payload.discount_value <= 0 || (payload.discount_type === 'percentage' && payload.discount_value > 100) || (payload.discount_type === 'static' && !Number.isSafeInteger(payload.discount_value)) || !Number.isSafeInteger(payload.usage_limit) || payload.usage_limit < 0) return toast.error('کد، مقدار تخفیف و سقف استفاده را بررسی کنید');
    setSaving(true);
    try {
      editing ? await couponsApi.update(editing.id, payload) : await couponsApi.create(payload);
      toast.success(editing ? 'کد تخفیف ویرایش شد' : 'کد تخفیف ساخته شد');
      setOpen(false); void load();
    } catch (error) { toast.error(isAxiosError(error) && typeof error.response?.data?.error === 'string' ? error.response.data.error : 'ذخیره کد تخفیف ناموفق بود'); }
    finally { setSaving(false); }
  };
  const toggle = async (row: CouponResponse) => {
    if (toggling) return;
    setToggling(row.id);
    try { await couponsApi.update(row.id, { is_active: !row.is_active }); await load(); }
    catch { toast.error('تغییر وضعیت ناموفق بود'); }
    finally { setToggling(null); }
  };
  const remove = async () => {
    if (!deleting || saving) return;
    setSaving(true);
    try { await couponsApi.delete(deleting.id); toast.success('کد تخفیف حذف شد'); setDeleting(null); void load(); }
    catch { toast.error('حذف کد تخفیف ناموفق بود'); }
    finally { setSaving(false); }
  };
  const columns: Column<CouponResponse>[] = [
    { key: 'code', title: 'کد تخفیف', render: (_, row) => <div className="finance-stack"><CopyIdentifier value={row.code} label="کد تخفیف" full /><span className="finance-muted">{row.discount_type === 'percentage' ? 'تخفیف درصدی' : 'تخفیف ثابت'}</span></div> },
    { key: 'discount_value', title: 'مقدار', render: (_, row) => <span className="finance-amount">{row.discount_type === 'percentage' ? `${row.discount_value.toLocaleString('fa-IR')}٪` : <StarsAmount value={row.discount_value} />}</span> },
    { key: 'usage_count', title: 'مصرف / ظرفیت', render: (_, row) => <div className="finance-coupon-usage"><span>{row.usage_count.toLocaleString('fa-IR')} از {row.usage_limit ? row.usage_limit.toLocaleString('fa-IR') : 'نامحدود'}</span>{row.usage_limit > 0 && <progress value={Math.min(row.usage_count, row.usage_limit)} max={row.usage_limit} aria-label={`مصرف کد ${row.code}`} />}</div> },
    { key: 'user_ids', title: 'دامنه استفاده', render: (_, row) => <div className="finance-stack"><span>{row.user_ids?.length ? `${row.user_ids.length.toLocaleString('fa-IR')} کاربر منتخب` : 'همه کاربران'}</span><span className="finance-muted">{row.product_ids?.length ? `${row.product_ids.length.toLocaleString('fa-IR')} محصول منتخب` : 'همه محصولات'}</span></div> },
    { key: 'expires_at', title: 'اعتبار', render: (_, row) => { const status = states[couponState(row)]; return <div className="finance-stack"><Badge variant={status.variant} dot>{status.label}</Badge><span className="finance-muted">{row.expires_at ? formatDate(row.expires_at) : 'بدون انقضا'}</span></div>; } },
    { key: 'is_active', title: 'فعال‌سازی', render: (_, row) => <Toggle size="sm" ariaLabel={`فعال‌سازی کد ${row.code}`} checked={row.is_active} disabled={Boolean(toggling)} onChange={() => void toggle(row)} /> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => begin(row)}>ویرایش</Button><Button variant="ghost" size="sm" className="text-rose-500" aria-label={`حذف کد ${row.code}`} icon={<Trash2 size={14} />} onClick={() => setDeleting(row)} /></div> },
  ];
  return <div className="finance-page">
    <CatalogHeader title="کدهای تخفیف" icon={TicketPercent} total={total} loading={loading} actions={<Button icon={<Plus size={16} />} onClick={() => begin()}>کد جدید</Button>} />
    <CouponSummary summary={summary} loading={loading} />
    <CatalogTable columns={columns} data={rows} loading={loading} error={error} onRefresh={() => void load()} keyExtractor={row => row.id} searchText={row => [row.code,row.id,...(row.product_ids || []),...(row.user_ids || [])].join(' ')}
      filter={{ label: 'همه وضعیت‌ها', options: Object.entries(states).map(([value, state]) => ({ value, label: state.label })), value: couponState }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز کد تخفیفی ایجاد نشده است" emptyAction={<Button onClick={() => begin()} icon={<Plus size={15} />}>ساخت کد تخفیف</Button>} />
    <CatalogModal isOpen={open} onClose={() => { if (!saving) setOpen(false); }} title={editing ? 'ویرایش کد تخفیف' : 'کد تخفیف جدید'} size="lg"
      footer={<><Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>انصراف</Button><Button type="submit" form="coupon-form" loading={saving} disabled={form.user_scope === 'selected' && !form.user_ids.length}>ذخیره</Button></>}>
      <CouponForm form={form} onChange={setForm} saving={saving} onSubmit={submit} />
    </CatalogModal>
    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => { if (!saving) setDeleting(null); }} onConfirm={remove} title="حذف کد تخفیف" message={`کد «${deleting?.code || ''}» برای همیشه حذف شود؟`} confirmText="حذف" loading={saving} />
  </div>;
}
