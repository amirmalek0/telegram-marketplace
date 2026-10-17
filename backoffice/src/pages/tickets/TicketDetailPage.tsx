import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CalendarDays, Clock3, Hash, Headphones, MessageSquareText, Send, UserRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ticketsApi } from '@/api';
import type { TicketPriority, TicketStatus, TicketWithMessagesResponse } from '@/types';
import { Badge, Button, Select, Skeleton, Textarea } from '@/components/ui';
import { SystemHeader } from '@/components/system/SystemHeader';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { formatDateTime } from '@/utils/format';
import { TicketUserPanel } from './TicketUserSummary';
import { priorityOptions, statusOptions, ticketPriorities, ticketStatuses } from './ticketMeta';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState<TicketWithMessagesResponse | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticketId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    ticketsApi.get(ticketId, controller.signal)
      .then(result => { if (!controller.signal.aborted) setThread(result); })
      .catch(requestError => {
        if (requestError?.code !== 'ERR_CANCELED') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [ticketId, revision]);

  useEffect(() => {
    if (!loading && thread) messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [loading, thread?.messages.length]);

  const updateTicket = async (field: 'status' | 'priority', value: TicketStatus | TicketPriority) => {
    if (!ticketId || !thread || updating) return;
    setUpdating(true);
    try {
      const updated = await ticketsApi.update(ticketId, { [field]: value });
      setThread(current => current ? { ...current, ticket: { ...current.ticket, ...updated, user: current.ticket.user } } : current);
      toast.success('اطلاعات تیکت به‌روز شد');
    } catch {
      toast.error('به‌روزرسانی تیکت ناموفق بود');
    } finally {
      setUpdating(false);
    }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!ticketId || !thread || sending || thread.ticket.status === 'closed' || !reply.trim()) return;
    setSending(true);
    try {
      const message = await ticketsApi.addMessage(ticketId, reply.trim());
      setThread(current => current ? {
        ...current,
        ticket: { ...current.ticket, last_message_at: message.created_at },
        messages: [...current.messages, message],
      } : current);
      setReply('');
      toast.success('پاسخ برای کاربر ارسال شد');
    } catch {
      toast.error('ارسال پاسخ ناموفق بود');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="space-y-5"><Skeleton className="h-24 rounded-2xl" /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[650px] rounded-2xl" /><Skeleton className="h-[520px] rounded-2xl" /></div></div>;

  if (error || !thread) return <div className="surface-card catalog-empty" role="alert"><AlertCircle size={28} /><h1>دریافت تیکت ناموفق بود</h1><Button variant="secondary" onClick={() => setRevision(value => value + 1)}>تلاش دوباره</Button><Button variant="ghost" icon={<ArrowRight size={15} />} onClick={() => navigate('/tickets')}>بازگشت به تیکت‌ها</Button></div>;

  const { ticket, messages } = thread;
  const status = ticketStatuses[ticket.status];
  const priority = ticketPriorities[ticket.priority];

  return <div className="system-page pb-8">
    <SystemHeader title={ticket.subject} icon={MessageSquareText}><Button variant="secondary" icon={<ArrowRight size={15} />} onClick={() => navigate('/tickets')}>تیکت‌ها</Button></SystemHeader>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className="surface-card support-chat">
        <header className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--color-border))] px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><MessageSquareText size={19} /></span>
          <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-extrabold">گفت‌وگوی پشتیبانی</h2><p className="mt-0.5 text-[10px] text-[rgb(var(--color-text-muted))]">{messages.length.toLocaleString('fa-IR')} پیام</p></div>
          <Badge variant={status.variant} dot>{status.label}</Badge>
          <Badge variant={priority.variant}>{`اولویت ${priority.label}`}</Badge>
        </header>

        <div className="support-messages" role="log" aria-label="پیام‌های تیکت" aria-live="polite">
          {messages.map(message => {
            const isAdmin = message.sender_type === 'admin';
            return <article key={message.id} className={`support-bubble ${isAdmin ? 'is-admin' : 'is-user'}`}>
              <div className="support-bubble-content">
                <div className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold ${isAdmin ? 'text-blue-100' : 'text-[rgb(var(--color-text-secondary))]'}`}>{isAdmin ? <Headphones size={12} /> : <UserRound size={12} />}<span>{isAdmin ? 'پشتیبانی' : ticket.user ? `${ticket.user.first_name} ${ticket.user.last_name}`.trim() || 'کاربر' : 'کاربر'}</span></div>
                <p className="whitespace-pre-wrap break-words text-xs leading-7 sm:text-sm">{message.message}</p>
                <time className={`mt-2 block text-[11px] ${isAdmin ? 'text-white/80' : 'text-[rgb(var(--color-text-muted))]'}`} dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
              </div>
            </article>;
          })}
          {messages.length === 0 && <div className="m-auto text-center text-sm text-[rgb(var(--color-text-muted))]">هنوز پیامی در این گفت‌وگو وجود ندارد.</div>}
          <div ref={messagesEndRef} />
        </div>

        {ticket.status === 'closed' ? <div className="border-t border-[rgb(var(--color-border))] bg-slate-500/5 p-4 text-center text-xs text-[rgb(var(--color-text-secondary))]">این تیکت بسته شده است. برای ارسال پاسخ، وضعیت را از پنل اطلاعات باز کنید.</div> : <form onSubmit={sendReply} className="support-composer">
          <div className="min-w-0 flex-1"><Textarea aria-label="متن پاسخ" disabled={sending} rows={2} value={reply} onChange={event => setReply(event.target.value)} placeholder="پاسخ خود را بنویسید..." className="min-h-[76px] resize-none" /></div>
          <Button type="submit" loading={sending} disabled={!reply.trim()} icon={<Send size={15} />} className="mb-0.5 shrink-0">ارسال</Button>
        </form>}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-[92px]">
        <section className="surface-card p-4">
          <h2 className="mb-4 text-sm font-extrabold">اطلاعات و رسیدگی</h2>
          <div className="space-y-3">
            <Select label="وضعیت تیکت" value={ticket.status} disabled={updating} options={statusOptions} onChange={event => void updateTicket('status', event.target.value as TicketStatus)} />
            <Select label="اولویت" value={ticket.priority} disabled={updating} options={priorityOptions} onChange={event => void updateTicket('priority', event.target.value as TicketPriority)} />
          </div>
          <div className="mt-4 divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/60 px-3">
            <TicketFact icon={<MessageSquareText size={13} />} label="دسته" value={ticket.category || 'عمومی'} />
            <TicketFact icon={<Hash size={13} />} label="شناسه تیکت" value={ticket.id} ltr />
            <TicketFact icon={<CalendarDays size={13} />} label="ایجاد" value={formatDateTime(ticket.created_at)} />
            <TicketFact icon={<Clock3 size={13} />} label="آخرین پیام" value={formatDateTime(ticket.last_message_at)} />
            <TicketFact icon={<Clock3 size={13} />} label="به‌روزرسانی" value={formatDateTime(ticket.updated_at)} />
            {ticket.closed_at && <TicketFact icon={<Clock3 size={13} />} label="بسته‌شدن" value={formatDateTime(ticket.closed_at)} />}
          </div>
        </section>

        <TicketUserPanel user={ticket.user} compact />
      </aside>
    </div>
  </div>;
}

function TicketFact({ icon, label, value, ltr = false }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return <div className="py-3"><span className="mb-1 flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-muted))]">{icon}{label}</span>{ltr ? <CopyIdentifier value={value} label={label} full /> : <b className="block text-xs font-medium">{value}</b>}</div>;
}
