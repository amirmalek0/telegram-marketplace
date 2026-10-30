import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Crown, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vipApi } from '@/api';
import type { CreateVipPlanRequest, VipPlanResponse } from '@/types';
import { Badge, Button, ConfirmationModal } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogPrices } from '@/components/catalog/CatalogPrices';
import { formatDate } from '@/utils/format';
import { VipPlanModal } from './VipPlanModal';
import '@/components/customers/customers.css';
import '@/components/finance/finance.css';

const initial: CreateVipPlanRequest = { toman_price: 0, title: '', stars_price: 0, duration: 30, tier: 1, status: 'active' };
export default function VipPage() {
  const [rows, setRows] = useState<VipPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<CreateVipPlanRequest>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VipPlanResponse | null>(null);
  const [deleting, setDeleting] = useState<VipPlanResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError(false);
    try { const result = await vipApi.list({ page, per_page: 20 }); if (current !== request.current) return; setRows(result.data); setTotal(result.total); }
    catch { if (current === request.current) setError(true); } finally { if (current === request.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const begin = (row?: VipPlanResponse) => {
    setEditing(row || null); setForm(row ? { toman_price: row.toman_price ?? 0, title: row.title, stars_price: row.stars_price, duration: row.duration, tier: row.tier, status: row.status } : initial); setOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    if (!form.title.trim() || [form.duration,form.stars_price,form.tier].some(value => !Number.isSafeInteger(value) || value < 1)) return toast.error('عنوان و مقادیر صحیح و مثبت را وارد کنید');
    setSaving(true);
    try { const payload = { ...form, title: form.title.trim() }; editing ? await vipApi.update(editing.id, payload) : await vipApi.create(payload); toast.success('پلن VIP ذخیره شد'); setOpen(false); void load(); }
    catch { toast.error('ذخیره پلن ناموفق بود'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || saving) return; setSaving(true);
    try { await vipApi.delete(deleting.id); setDeleting(null); toast.success('پلن حذف شد'); void load(); }
    catch { toast.error('حذف پلن ناموفق بود'); } finally { setSaving(false); }
  };
  const columns: Column<VipPlanResponse>[] = [
    { key: 'title', title: 'اشتراک', render: (_, row) => <button type="button" className="customer-offer-title" onClick={() => begin(row)}><span className="customer-offer-icon"><Crown size={22} /></span><b>{row.title}</b></button> },
    { key: 'stars_price', title: 'قیمت', render: (_, row) => <CatalogPrices stars={row.stars_price} toman={row.toman_price} /> },
    { key: 'duration', title: 'مدت اعتبار', render: value => <span className="inline-flex items-center gap-2 text-xs"><CalendarDays size={15} className="text-[rgb(var(--color-text-secondary))]" />{Number(value).toLocaleString('fa-IR')} روز</span> },
    { key: 'tier', title: 'سطح دسترسی', render: value => <Badge variant="purple">سطح {Number(value).toLocaleString('fa-IR')}</Badge> },
    { key: 'status', title: 'وضعیت', render: value => <Badge variant={value === 'active' ? 'success' : 'default'} dot>{value === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    { key: 'created_at', title: 'تاریخ ایجاد', render: value => <span className="finance-muted">{formatDate(value as string)}</span> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => begin(row)}>ویرایش</Button><Button variant="ghost" size="sm" className="text-rose-500" aria-label={`حذف پلن ${row.title}`} icon={<Trash2 size={14} />} onClick={() => setDeleting(row)} /></div> },
  ];
  return <div className="customers-page">
    <CatalogHeader title="پلن‌های VIP" icon={Crown} total={total} loading={loading} actions={<Button icon={<Plus size={16} />} onClick={() => begin()}>پلن جدید</Button>} />
    <CatalogTable columns={columns} data={rows} loading={loading} error={error} onRefresh={() => void load()} keyExtractor={row => row.id} searchText={row => row.title}
      filter={{ label: 'همه وضعیت‌ها', options: [{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }], value: row => row.status }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="پلن VIP تعریف نشده است" emptyAction={<Button onClick={() => begin()}>پلن جدید</Button>} />
    <VipPlanModal open={open} isNew={!editing} form={form} onChange={setForm} saving={saving} onClose={() => { if (!saving) setOpen(false); }} onSubmit={submit} />
    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => { if (!saving) setDeleting(null); }} onConfirm={remove} title="حذف پلن" message={`پلن «${deleting?.title || ''}» حذف شود؟`} confirmText="حذف" loading={saving} />
  </div>;
}
