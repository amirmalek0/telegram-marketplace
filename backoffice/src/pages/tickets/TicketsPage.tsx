import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, Plus, Settings2, Trash2, Ticket, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketCategoriesApi, ticketsApi } from '@/api';
import type { TicketCategoryResponse, TicketPriority, TicketResponse, TicketStatus } from '@/types';
import { Button, ConfirmationModal, Input, Modal, Select, Skeleton } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import '@/components/system/system.css';
import { TicketListItem } from './TicketListItem';
import { priorityOptions, statusOptions } from './ticketMeta';

const perPage = 20;

export default function TicketsPage() {
  const [rows, setRows] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestSequence = useRef(0);
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<TicketResponse | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<TicketCategoryResponse[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(false);
    try {
      const response = await ticketsApi.list({ page, per_page: perPage, ...(status && { status }), ...(priority && { priority }) });
      if (sequence !== requestSequence.current) return;
      setRows(response.data);
      setTotal(response.total);
      if (page > 1 && response.data.length === 0) setPage(Math.max(1, Math.ceil(response.total / perPage)));
    } catch {
      if (sequence === requestSequence.current) setError(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, priority, status]);

  useEffect(() => { void load(); return () => { requestSequence.current++; }; }, [load]);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(false);
    try {
      const response = await ticketCategoriesApi.list({ page: 1, per_page: 100 });
      setCategories(response.data);
    } catch {
      setCategoriesError(true);
    } finally { setCategoriesLoading(false); }
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
    if (!categoryName.trim() || saving) return;
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
    if (saving) return;
    setSaving(true);
    try {
      await ticketCategoriesApi.delete(id);
      toast.success('دسته حذف شد');
      await loadCategories();
    } catch {
      toast.error('این دسته احتمالاً در حال استفاده است');
    } finally { setSaving(false); }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return <div className="system-page">
    <CatalogHeader title="تیکت‌ها" icon={Ticket} total={total} loading={loading} actions={<Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => { setCategoriesOpen(true); void loadCategories(); }}>دسته‌های پشتیبانی</Button>} />
    <section className="surface-card overflow-hidden" aria-busy={loading}>
    <div className="system-toolbar">
      <h2 className="system-toolbar-title"><Inbox size={18} />صف پشتیبانی</h2>
      <Select aria-label="فیلتر وضعیت" value={status} onChange={event => { setStatus(event.target.value as TicketStatus | ''); setPage(1); }} options={[{ value: '', label: 'همه وضعیت‌ها' }, ...statusOptions]} />
      <Select aria-label="فیلتر اولویت" value={priority} onChange={event => { setPriority(event.target.value as TicketPriority | ''); setPage(1); }} options={[{ value: '', label: 'همه اولویت‌ها' }, ...priorityOptions]} />
      <button type="button" className="catalog-refresh" aria-label="تازه‌سازی تیکت‌ها" disabled={loading} onClick={() => void load()}><RefreshCw size={17} /></button>
      {(status || priority) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setPriority(''); setPage(1); }}>پاک کردن فیلترها</Button>}
    </div>

      {loading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div> : error ? <div className="catalog-empty" role="alert"><AlertCircle size={28} /><p>دریافت تیکت‌ها ناموفق بود</p><Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div> : rows.length === 0 ? <div className="catalog-empty"><Inbox size={28} /><h3>تیکتی پیدا نشد</h3><p>فیلترها را تغییر دهید یا منتظر درخواست جدید بمانید.</p></div> : rows.map(ticket => <TicketListItem key={ticket.id} ticket={ticket} onUpdate={update} onDelete={setDeleting} />)}
    </section>

    {totalPages > 1 && <div className="mt-4 flex items-center justify-between text-xs text-[rgb(var(--color-text-secondary))]"><span>صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}</span><div className="flex gap-1"><button className="icon-button !h-8 !w-8 border border-[rgb(var(--color-border))]" disabled={page <= 1} onClick={() => setPage(current => current - 1)} aria-label="صفحه قبل"><ChevronRight size={15} /></button><button className="icon-button !h-8 !w-8 border border-[rgb(var(--color-border))]" disabled={page >= totalPages} onClick={() => setPage(current => current + 1)} aria-label="صفحه بعد"><ChevronLeft size={15} /></button></div></div>}

    <Modal isOpen={categoriesOpen} onClose={() => !saving && setCategoriesOpen(false)} title="دسته‌های پشتیبانی" icon={<Settings2 size={19} />} size="lg">
      <form onSubmit={addCategory} className="mb-5 flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><Input label="دسته جدید" disabled={saving} value={categoryName} onChange={event => setCategoryName(event.target.value)} placeholder="مثلاً امور مالی" /></div><Button type="submit" loading={saving} disabled={!categoryName.trim()} icon={<Plus size={15} />}>افزودن</Button></form>
      {categoriesLoading ? <div role="status" className="space-y-3"><Skeleton className="h-14 rounded-xl" /><Skeleton className="h-14 rounded-xl" /></div> : categoriesError ? <div className="catalog-empty" role="alert"><p>دریافت دسته‌ها ناموفق بود</p><Button variant="secondary" onClick={() => void loadCategories()}>تلاش دوباره</Button></div> : <div className="divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))]">{categories.map(category => <div key={category.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 break-words text-sm font-medium">{category.name}</span><Button variant="ghost" size="sm" disabled={saving} className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => void removeCategory(category.id)}>حذف</Button></div>)}{categories.length === 0 && <p className="p-6 text-center text-sm text-[rgb(var(--color-text-muted))]">دسته‌ای ایجاد نشده است</p>}</div>}
    </Modal>

    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => !saving && setDeleting(null)} onConfirm={() => void remove()} title="حذف تیکت" message={`تیکت «${deleting?.subject || ''}» برای همیشه حذف شود؟`} confirmText="حذف تیکت" loading={saving} />
  </div>;
}
