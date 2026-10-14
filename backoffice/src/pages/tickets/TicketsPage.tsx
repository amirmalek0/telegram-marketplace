import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Plus, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketCategoriesApi, ticketsApi } from '@/api';
import type { TicketCategoryResponse, TicketPriority, TicketResponse, TicketStatus } from '@/types';
import { Badge, Button, ConfirmationModal, Input, Modal, PageHeader, Select, Skeleton } from '@/components/ui';
import { TicketListItem } from './TicketListItem';
import { priorityOptions, statusOptions } from './ticketMeta';

const perPage = 20;

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TicketResponse | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<TicketCategoryResponse[]>([]);
  const [categoryName, setCategoryName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ticketsApi.list({ page, per_page: perPage, ...(status && { status }), ...(priority && { priority }) });
      setRows(response.data);
      setTotal(response.total);
    } catch {
      toast.error('دریافت تیکت‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [page, priority, status]);

  useEffect(() => { void load(); }, [load]);

  const loadCategories = async () => {
    try {
      const response = await ticketCategoriesApi.list({ page: 1, per_page: 100 });
      setCategories(response.data);
    } catch {
      toast.error('دسته‌های پشتیبانی دریافت نشد');
    }
  };

  const update = async (ticket: TicketResponse, field: 'status' | 'priority', value: string) => {
    try {
      const updated = await ticketsApi.update(ticket.id, { [field]: value });
      setRows(current => current.map(item => item.id === ticket.id ? { ...item, ...updated, user: item.user } : item));
      toast.success('تیکت به‌روز شد');
    } catch {
      toast.error('تغییر تیکت ناموفق بود');
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await ticketsApi.delete(deleting.id);
      setDeleting(null);
      toast.success('تیکت حذف شد');
      await load();
    } catch {
      toast.error('حذف تیکت ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setSaving(true);
    try {
      await ticketCategoriesApi.create(categoryName.trim());
      setCategoryName('');
      toast.success('دسته پشتیبانی ایجاد شد');
      await loadCategories();
    } catch {
      toast.error('ساخت دسته ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await ticketCategoriesApi.delete(id);
      toast.success('دسته حذف شد');
      await loadCategories();
    } catch {
      toast.error('این دسته احتمالاً در حال استفاده است');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return <div>
    <PageHeader title="مرکز تیکت‌ها" action={<Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => { setCategoriesOpen(true); void loadCategories(); }}>دسته‌ها</Button>} />

    <div className="filter-bar">
      <Select aria-label="فیلتر وضعیت" value={status} onChange={event => { setStatus(event.target.value as TicketStatus | ''); setPage(1); }} options={[{ value: '', label: 'همه وضعیت‌ها' }, ...statusOptions]} />
      <Select aria-label="فیلتر اولویت" value={priority} onChange={event => { setPriority(event.target.value as TicketPriority | ''); setPage(1); }} options={[{ value: '', label: 'همه اولویت‌ها' }, ...priorityOptions]} />
      <Badge variant="info">{total.toLocaleString('fa-IR')} تیکت</Badge>
    </div>

    <section className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-5 py-3.5">
        <div><h2 className="text-sm font-extrabold">صف پشتیبانی</h2><p className="mt-0.5 text-[10px] text-[rgb(var(--color-text-muted))]">اطلاعات اصلی در یک نگاه؛ جزئیات و گفت‌وگو در صفحه هر تیکت</p></div>
        <Inbox size={18} className="text-[rgb(var(--color-text-muted))]" />
      </div>
      {loading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}</div> : rows.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-600"><Inbox size={22} /></span><h3 className="text-sm font-bold">تیکتی پیدا نشد</h3><p className="mt-1 text-xs text-[rgb(var(--color-text-muted))]">فیلترها را تغییر دهید یا منتظر درخواست جدید بمانید.</p></div> : rows.map(ticket => <TicketListItem key={ticket.id} ticket={ticket} onUpdate={update} onDelete={setDeleting} />)}
    </section>

    {totalPages > 1 && <div className="mt-4 flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))]"><span>صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span><div className="flex gap-1"><button className="icon-button !h-8 !w-8 border border-[rgb(var(--color-border))]" disabled={page <= 1} onClick={() => setPage(current => current - 1)} aria-label="صفحه قبل"><ChevronRight size={15} /></button><button className="icon-button !h-8 !w-8 border border-[rgb(var(--color-border))]" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} aria-label="صفحه بعد"><ChevronLeft size={15} /></button></div></div>}

    <Modal isOpen={categoriesOpen} onClose={() => setCategoriesOpen(false)} title="دسته‌های پشتیبانی" description="دسته‌هایی که کاربر هنگام ثبت تیکت می‌بیند" size="lg">
      <form onSubmit={addCategory} className="mb-4 flex items-end gap-2"><div className="flex-1"><Input label="دسته جدید" value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="مثلاً امور مالی" /></div><Button type="submit" loading={saving} icon={<Plus size={15} />}>افزودن</Button></form>
      <div className="divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))]">{categories.map(category => <div key={category.id} className="flex items-center justify-between p-3"><span className="font-medium">{category.name}</span><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => void removeCategory(category.id)}>حذف</Button></div>)}{categories.length === 0 && <p className="p-6 text-center text-sm text-[rgb(var(--color-text-muted))]">دسته‌ای ایجاد نشده است</p>}</div>
    </Modal>

    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={() => void remove()} title="حذف تیکت" message={`تیکت «${deleting?.subject || ''}» برای همیشه حذف شود؟`} confirmText="حذف تیکت" loading={saving} />
  </div>;
}
