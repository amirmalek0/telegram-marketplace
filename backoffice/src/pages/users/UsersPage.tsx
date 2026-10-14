import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Pencil, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi } from '@/api';
import { UpdateUserRequest, UserResponse } from '@/types';
import { Badge, Button, ConfirmationModal, DataTable, Input, Modal, PageHeader, Toggle } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDate } from '@/utils/format';

export default function UsersPage() {
  const navigate = useNavigate(); const [rows, setRows] = useState<UserResponse[]>([]); const [total, setTotal] = useState(0); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [query, setQuery] = useState(''); const [editing, setEditing] = useState<UserResponse | null>(null); const [deleting, setDeleting] = useState<UserResponse | null>(null); const [form, setForm] = useState<UpdateUserRequest>({}); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { const r = await usersApi.list({ page, per_page: 20 }); setRows(r.data); setTotal(r.total); } catch { toast.error('دریافت کاربران ناموفق بود'); } finally { setLoading(false); } }, [page]); useEffect(() => { load(); }, [load]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); return q ? rows.filter(x => `${x.first_name} ${x.last_name} ${x.username} ${x.telegram_id}`.toLowerCase().includes(q)) : rows; }, [query, rows]);
  const begin = (r: UserResponse) => { setEditing(r); setForm({ first_name: r.first_name, last_name: r.last_name, username: r.username, phone_number: r.phone_number }); };
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!editing) return; setSaving(true); try { const updated = await usersApi.update(editing.id, form); setRows(v => v.map(x => x.id === updated.id ? updated : x)); setEditing(null); toast.success('پروفایل کاربر ویرایش شد'); } catch { toast.error('ویرایش کاربر ناموفق بود'); } finally { setSaving(false); } };
  const ban = async (r: UserResponse) => { try { await usersApi.setBanned(r.id, !r.is_banned); setRows(v => v.map(x => x.id === r.id ? { ...x, is_banned: !x.is_banned } : x)); toast.success(r.is_banned ? 'محدودیت کاربر برداشته شد' : 'کاربر مسدود شد'); } catch { toast.error('تغییر وضعیت کاربر ناموفق بود'); } };
  const remove = async () => { if (!deleting) return; setSaving(true); try { await usersApi.delete(deleting.id); setDeleting(null); toast.success('کاربر حذف شد'); load(); } catch { toast.error('حذف کاربر ناموفق بود'); } finally { setSaving(false); } };
  const columns: Column<UserResponse>[] = [
    { key: 'first_name', title: 'کاربر', render: (_, r) => <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-xs font-extrabold text-blue-600">{(r.first_name?.[0] || 'U').toUpperCase()}</div><div><b>{`${r.first_name} ${r.last_name}`.trim() || 'بدون نام'}</b><p dir="ltr" className="mt-0.5 text-right text-[10px] text-[rgb(var(--color-text-muted))]">@{r.username || '—'}</p></div></div> },
    { key: 'telegram_id', title: 'تلگرام', render: v => <span dir="ltr" className="mono-id">{Number(v).toLocaleString('en-US')}</span> },
    { key: 'has_active_plan', title: 'عضویت', render: v => v ? <Badge variant="purple" dot>VIP</Badge> : <Badge>عادی</Badge> },
    { key: 'is_banned', title: 'دسترسی', render: (v, r) => <Toggle size="sm" checked={!v} onChange={() => ban(r)} label={v ? 'مسدود' : 'فعال'} /> },
    { key: 'created_at', title: 'عضویت', render: v => <span className="text-xs">{formatDate(v as string)}</span> },
    { key: 'actions', title: 'عملیات', render: (_, r) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<MessageSquareText size={14} />} onClick={() => navigate(`/users/${r.id}/tickets`)}>تیکت‌ها</Button><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => begin(r)} aria-label="ویرایش" /><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => setDeleting(r)} aria-label="حذف" /></div> },
  ];
  return <div><PageHeader title="کاربران" /><div className="filter-bar"><Search size={16} className="text-[rgb(var(--color-text-muted))]" /><input value={query} onChange={e => setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="جستجو در صفحه با نام، نام کاربری یا شناسه تلگرام" /><Badge variant="info">{total.toLocaleString('fa-IR')} کاربر</Badge></div><DataTable columns={columns} data={filtered} loading={loading} keyExtractor={r => r.id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="کاربری یافت نشد" />
    <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="ویرایش پروفایل کاربر" footer={<><Button variant="secondary" onClick={() => setEditing(null)}>انصراف</Button><Button loading={saving} onClick={() => document.getElementById('user-submit')?.click()}>ذخیره</Button></>}><form onSubmit={submit} className="space-y-4"><div className="grid grid-cols-2 gap-3"><Input label="نام" value={form.first_name || ''} onChange={e => setForm({ ...form, first_name: e.target.value })} /><Input label="نام خانوادگی" value={form.last_name || ''} onChange={e => setForm({ ...form, last_name: e.target.value })} /></div><Input label="نام کاربری" value={form.username || ''} onChange={e => setForm({ ...form, username: e.target.value })} /><Input label="شماره تلفن" value={form.phone_number || ''} onChange={e => setForm({ ...form, phone_number: e.target.value })} /><button id="user-submit" className="hidden" /></form></Modal>
    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={remove} title="حذف کاربر" message={`حساب «${deleting?.first_name || ''} ${deleting?.last_name || ''}» و داده‌های وابسته حذف شود؟`} confirmText="حذف کاربر" loading={saving} />
  </div>;
}
