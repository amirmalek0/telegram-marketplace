import { useEffect, useRef, useState } from 'react';
import { Archive, Megaphone, Plus, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { broadcastsApi, type Broadcast } from '@/api/broadcasts';
import { Button } from '@/components/ui/Button';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { type Column } from '@/components/ui/DataTable';
import { Badge, Modal } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogIdentity } from '@/components/catalog/CatalogIdentity';
import { BroadcastComposer } from './BroadcastComposer';
import '@/components/system/system.css';

export default function BroadcastsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<Broadcast[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewing, setViewing] = useState<Broadcast | null>(null);
  const [archive, setArchive] = useState<Broadcast | null>(null);
  // Retain the same key on retry: a lost response must not publish twice.
  const request = useRef<{ title: string; message: string; request_id: string } | null>(null);
  const working = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    broadcastsApi.list(page, controller.signal).then(result => {
      if (!controller.signal.aborted) { setItems(result.data); setTotal(result.total); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);

  async function publish() {
    if (working.current) return;
    working.current = true; setBusy(true);
    const values = { title: title.trim(), message: message.trim() };
    if (!request.current || request.current.title !== values.title || request.current.message !== values.message) {
      request.current = { ...values, request_id: crypto.randomUUID() };
    }
    try {
      await broadcastsApi.publish(request.current);
      request.current = null; setTitle(''); setMessage(''); setConfirm(false); setComposerOpen(false); setPage(1); setRevision(v => v + 1);
      toast.success('اعلان در صندوق اعلان همه کاربران منتشر شد.');
    } catch { toast.error('انتشار تأیید نشد؛ دوباره تلاش کنید.'); }
    finally { working.current = false; setBusy(false); }
  }

  async function archiveMessage() {
    if (!archive || working.current) return;
    working.current = true; setBusy(true);
    try { await broadcastsApi.archive(archive.id); setArchive(null); setRevision(v => v + 1); toast.success('اعلان بایگانی شد.'); }
    catch { toast.error('بایگانی ناموفق بود؛ دوباره تلاش کنید.'); }
    finally { working.current = false; setBusy(false); }
  }

  const columns: Column<Broadcast>[] = [
    { key: 'title', title: 'اعلان', render: (_, item) => <CatalogIdentity title={item.title} subtitle={item.message.slice(0, 90)} icon={Megaphone} onClick={() => setViewing(item)} /> },
    { key: 'published_at', title: 'انتشار', render: value => new Date(value as string).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }) },
    { key: 'read_count', title: 'خوانده‌شده', render: value => <span className="flex items-center gap-2"><Eye size={15} className="text-[rgb(var(--color-text-muted))]" />{Number(value).toLocaleString('fa-IR')}</span> },
    { key: 'archived_at', title: 'وضعیت', render: value => <Badge variant={value ? 'default' : 'success'} dot>{value ? 'بایگانی‌شده' : 'منتشرشده'}</Badge> },
    { key: 'id', title: 'عملیات', render: (_, item) => <div className="flex gap-2"><Button variant="ghost" size="sm" icon={<Eye size={15} />} onClick={() => setViewing(item)}>مشاهده</Button>{!item.archived_at && <Button variant="ghost" size="sm" icon={<Archive size={16} />} onClick={() => setArchive(item)}>بایگانی</Button>}</div> },
  ];

  return <div className="system-page">
    <CatalogHeader title="اعلان‌های همگانی" icon={Megaphone} total={total} loading={loading} actions={<Button icon={<Plus size={17} />} onClick={() => setComposerOpen(true)}>{title || message ? 'ادامه پیش‌نویس' : 'اعلان جدید'}</Button>} />
    <CatalogTable columns={columns} data={items} loading={loading} error={error} onRefresh={() => setRevision(v => v + 1)} keyExtractor={item => item.id} searchText={item => `${item.title} ${item.message}`} filter={{ label: 'وضعیت انتشار', options: [{ value: 'published', label: 'منتشرشده' }, { value: 'archived', label: 'بایگانی‌شده' }], value: item => item.archived_at ? 'archived' : 'published' }} emptyMessage="هنوز اعلانی منتشر نشده است" pagination={{ page, perPage: 20, total, onPageChange: setPage }} />
    <BroadcastComposer open={composerOpen && !confirm} busy={busy} title={title} message={message} onTitle={setTitle} onMessage={setMessage} onClose={() => !busy && setComposerOpen(false)} onReview={() => setConfirm(true)} />
    <Modal isOpen={Boolean(viewing)} onClose={() => setViewing(null)} title="جزئیات اعلان" icon={<Megaphone size={19} />} size="lg"><div className="broadcast-preview"><Badge variant={viewing?.archived_at ? 'default' : 'success'}>{viewing?.archived_at ? 'بایگانی‌شده' : 'منتشرشده'}</Badge><h3>{viewing?.title}</h3><p>{viewing?.message}</p></div></Modal>
    <ConfirmationModal isOpen={confirm} onClose={() => { if (!busy) setConfirm(false); }} onConfirm={publish} loading={busy} variant="warning" title="انتشار برای همه کاربران؟" message="این اعلان بلافاصله در مینی‌اپ نمایش داده می‌شود. پس از انتشار می‌توانید آن را بایگانی کنید." cancelText="بازگشت به ویرایش" confirmText="انتشار اعلان"><div className="text-right"><strong className="break-words">{title}</strong><p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7">{message}</p></div></ConfirmationModal>
    <ConfirmationModal isOpen={Boolean(archive)} onClose={() => { if (!busy) setArchive(null); }} onConfirm={archiveMessage} loading={busy} title="بایگانی اعلان؟" message="اعلان از صندوق همه کاربران حذف می‌شود؛ تاریخچه و آمار خواندن در پنل باقی می‌ماند." confirmText="بایگانی" />
  </div>;
}
