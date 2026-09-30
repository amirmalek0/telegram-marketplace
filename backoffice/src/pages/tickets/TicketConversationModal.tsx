import { FormEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, Headphones, MessageSquareText, Send, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketsApi } from '@/api';
import { Badge, Button, Modal, Skeleton, Textarea } from '@/components/ui';
import type { TicketResponse, TicketWithMessagesResponse } from '@/types';
import { formatDateTime, shortId } from '@/utils/format';
import { TicketUserPanel } from './TicketUserSummary';

interface TicketConversationModalProps {
  ticket: TicketResponse | null;
  onClose: () => void;
  onMessageSent: () => void;
}

const statusMeta = {
  open: { label: 'باز', variant: 'success' as const },
  in_progress: { label: 'در حال بررسی', variant: 'warning' as const },
  closed: { label: 'بسته', variant: 'default' as const },
};

const priorityLabels = { low: 'کم', medium: 'متوسط', high: 'زیاد', urgent: 'فوری' };

export function TicketConversationModal({ ticket, onClose, onMessageSent }: TicketConversationModalProps) {
  const [thread, setThread] = useState<TicketWithMessagesResponse | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticket) return;
    const controller = new AbortController();
    setThread(null);
    setReply('');
    setError(false);
    setLoading(true);

    ticketsApi.get(ticket.id, controller.signal)
      .then(setThread)
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [ticket]);

  useEffect(() => {
    if (!loading && thread) {
      messagesEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [loading, thread?.messages.length]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!ticket || !thread || thread.ticket.status === 'closed' || !reply.trim()) return;
    setSending(true);
    try {
      const message = await ticketsApi.addMessage(ticket.id, reply.trim());
      setThread((current) => current ? { ...current, messages: [...current.messages, message] } : current);
      setReply('');
      toast.success('پاسخ برای کاربر ارسال شد');
      onMessageSent();
    } catch {
      toast.error('ارسال پاسخ ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  const currentTicket = thread?.ticket || ticket;

  return (
    <Modal
      isOpen={Boolean(ticket)}
      onClose={onClose}
      title={currentTicket?.subject || 'گفت‌وگوی تیکت'}
      description={currentTicket ? `تیکت #${shortId(currentTicket.id)} · ${currentTicket.category}` : undefined}
      icon={<MessageSquareText size={18} />}
      size="xl"
    >
      <div className="flex h-[min(65vh,620px)] min-h-[430px] flex-col gap-4">
        {loading ? (
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-24 w-[72%] rounded-2xl" />
            <Skeleton className="mr-auto h-20 w-[66%] rounded-2xl" />
          </div>
        ) : error || !thread ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><AlertCircle size={22} /></span>
            <h3 className="text-sm font-bold">دریافت محتوای تیکت ناموفق بود</h3>
            <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">پنجره را ببندید و دوباره تلاش کنید.</p>
          </div>
        ) : (
          <>
            <TicketUserPanel user={thread.ticket.user} />
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/70 px-4 py-3">
              <Badge variant={statusMeta[thread.ticket.status].variant} dot>{statusMeta[thread.ticket.status].label}</Badge>
              <Badge variant={thread.ticket.priority === 'urgent' ? 'error' : thread.ticket.priority === 'high' ? 'warning' : 'info'}>{priorityLabels[thread.ticket.priority]}</Badge>
              <span className="text-[11px] text-[rgb(var(--color-text-secondary))]">{thread.ticket.category}</span>
              <span className="mr-auto text-[10px] text-[rgb(var(--color-text-muted))]">شروع: {formatDateTime(thread.ticket.created_at)}</span>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] p-4">
              {thread.messages.map((message) => {
                const isAdmin = message.sender_type === 'admin';
                return (
                  <article
                    key={message.id}
                    className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${isAdmin
                      ? 'ml-auto rounded-br-md bg-blue-600 text-white'
                      : 'mr-auto rounded-bl-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-text))]'}`}
                  >
                    <div className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold ${isAdmin ? 'text-blue-100' : 'text-[rgb(var(--color-text-secondary))]'}`}>
                      {isAdmin ? <Headphones size={12} /> : <UserRound size={12} />}
                      <span>{isAdmin ? 'پشتیبانی' : 'کاربر'}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-xs leading-7">{message.message}</p>
                    <time className={`mt-1.5 block text-[9px] ${isAdmin ? 'text-left text-blue-100/80' : 'text-right text-[rgb(var(--color-text-muted))]'}`} dateTime={message.created_at}>
                      {formatDateTime(message.created_at)}
                    </time>
                  </article>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {thread.ticket.status === 'closed' ? (
              <div className="rounded-2xl border border-slate-500/20 bg-slate-500/10 px-4 py-3 text-xs text-[rgb(var(--color-text-secondary))]">
                این تیکت بسته شده و امکان ارسال پاسخ جدید وجود ندارد.
              </div>
            ) : (
              <form onSubmit={sendReply} className="flex items-end gap-3 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3">
                <div className="min-w-0 flex-1">
                  <Textarea
                    aria-label="متن پاسخ"
                    rows={2}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="پاسخ خود را برای کاربر بنویسید..."
                    className="min-h-[70px] resize-none"
                  />
                </div>
                <Button type="submit" loading={sending} disabled={!reply.trim()} icon={<Send size={15} />} className="mb-0.5 shrink-0">
                  ارسال
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
