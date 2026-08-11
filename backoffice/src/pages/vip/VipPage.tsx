import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Crown, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { vipApi } from '@/api';
import { CreateVipPlanRequest, VipPlanResponse } from '@/types';
import { Badge, Button, ConfirmationModal, DataTable, Input, Modal, PageHeader, Select } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDate, formatMoney } from '@/utils/format';

const initial: CreateVipPlanRequest = { title: '', price: 0, duration: 30, status: 'active' };
export default function VipPage() {
  const [rows, setRows] = useState<VipPlanResponse[]>([]); const [loading, setLoading] = useState(true); const [total, setTotal] = useState(0); const [form, setForm] = useState<CreateVipPlanRequest>(initial); const [open, setOpen] = useState(false); const [editing, setEditing] = useState<VipPlanResponse | null>(null); const [deleting, setDeleting] = useState<VipPlanResponse | null>(null); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const r = await vipApi.list({ page: 1, per_page: 100 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت پلن‌ها ناموفق بود'); } finally { setLoading(false); } }, []); useEffect(() => { load(); }, [load]);
  const begin = (r?: VipPlanResponse) => { setEditing(r || null); setForm(r ? { title: r.title, price: r.price, duration: r.duration, status: r.status } : initial); setOpen(true); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!form.title.trim() || form.duration < 1) return toast.error('اطلاعات پلن را کامل کنید'); setSaving(true); try { editing ? await vipApi.update(editing.id, form) : await vipApi.create(form); toast.success('پلن VIP ذخیره شد'); setOpen(false); load(); } catch { toast.error('ذخیره پلن ناموفق بود'); } finally { setSaving(false); } };
  const remove = async () => { if (!deleting) return; setSaving(true); try { await vipApi.delete(deleting.id); setDeleting(null); toast.success('پلن حذف شد'); load(); } catch { toast.error('حذف پلن ناموفق بود'); } finally { setSaving(false); } };
  const columns: Column<VipPlanResponse>[] = [
    { key: 'title', title: 'پلن', render: v => <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><Crown size={17} /></span><b>{String(v)}</b></div> },
    { key: 'price', title: 'قیمت', render: v => <b>{formatMoney(Number(v))}</b> },
    { key: 'duration', title: 'مدت', render: v => <span>{Number(v).toLocaleString('fa-IR')} روز</span> },
    { key: 'status', title: 'وضعیت', render: v => <Badge variant={v === 'active' ? 'success' : 'default'} dot>{v === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    { key: 'created_at', title: 'ایجاد', render: v => <span className="text-xs">{formatDate(v as string)}</span> },
    { key: 'actions', title: 'عملیات', render: (_, r) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => begin(r)}>ویرایش</Button><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => setDeleting(r)}>حذف</Button></div> },
  ];
  return <div><PageHeader eyebrow="MEMBERSHIP" title="پلن‌های VIP" description="تعریف اشتراک‌های ویژه با مدت و قیمت مستقل" action={<Button icon={<Plus size={16} />} onClick={() => begin()}>پلن جدید</Button>} /><DataTable columns={columns} data={rows} loading={loading} keyExtractor={r => r.id} emptyMessage="پلن VIP تعریف نشده است" />{!loading && <p className="mt-3 text-xs text-[rgb(var(--color-text-muted))]">مجموع {total.toLocaleString('fa-IR')} پلن</p>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'ویرایش پلن' : 'پلن VIP جدید'} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>انصراف</Button><Button loading={saving} onClick={() => document.getElementById('vip-submit')?.click()}>ذخیره</Button></>}><form onSubmit={submit} className="space-y-4"><Input label="عنوان پلن" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /><Input label="قیمت (تومان)" type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} /><Input label="مدت (روز)" type="number" min="1" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} /><Select label="وضعیت" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }]} /><button id="vip-submit" className="hidden" /></form></Modal>
    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="حذف پلن" message={`پلن «${deleting?.title || ''}» حذف شود؟`} confirmText="حذف" loading={saving} />
  </div>;
}
