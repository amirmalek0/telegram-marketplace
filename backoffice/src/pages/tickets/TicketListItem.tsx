import { useState } from 'react';
import { CalendarDays, ChevronDown, Clock3, MessageSquareText, Settings2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TicketPriority, TicketResponse, TicketStatus } from '@/types';
import { Badge, Button, Select } from '@/components/ui';
import { formatDateTime, shortId } from '@/utils/format';
import { TicketUserIdentity } from './TicketUserSummary';
import { priorityOptions, statusOptions, ticketPriorities, ticketStatuses } from './ticketMeta';

interface TicketListItemProps {
  ticket: TicketResponse;
  onUpdate: (ticket: TicketResponse, field: 'status' | 'priority', value: string) => Promise<void>;
  onDelete: (ticket: TicketResponse) => void;
}

export function TicketListItem({ ticket, onUpdate, onDelete }: TicketListItemProps) {
  const navigate = useNavigate();
  const [manageOpen, setManageOpen] = useState(false);
  const status = ticketStatuses[ticket.status];
  const priority = ticketPriorities[ticket.priority];

  return <article className="border-b border-[rgb(var(--color-border))] last:border-0">
    <div className="grid gap-4 p-4 transition-colors hover:bg-[rgb(var(--color-primary))]/[0.02] lg:grid-cols-[minmax(0,1.25fr)_minmax(210px,.75fr)_auto] lg:items-center lg:px-5">
      <div className="min-w-0">
        <button onClick={() => navigate(`/tickets/${ticket.id}`)} className="group block max-w-full text-right">
          <h2 className="line-clamp-2 text-sm font-extrabold leading-6 group-hover:text-blue-600">{ticket.subject}</h2>
          <span dir="ltr" className="mt-1 block text-right font-mono text-[9px] text-[rgb(var(--color-text-muted))]">#{shortId(ticket.id)}</span>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={status.variant} dot>{status.label}</Badge>
          <Badge variant={priority.variant}>{`اولویت ${priority.label}`}</Badge>
          <Badge>{ticket.category || 'عمومی'}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[rgb(var(--color-text-muted))]">
          <span className="flex items-center gap-1.5"><CalendarDays size={12} />ایجاد: {formatDateTime(ticket.created_at)}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={12} />آخرین پیام: {formatDateTime(ticket.last_message_at)}</span>
          <span className="flex items-center gap-1.5">به‌روزرسانی: {formatDateTime(ticket.updated_at)}</span>
          {ticket.closed_at && <span>بسته‌شدن: {formatDateTime(ticket.closed_at)}</span>}
        </div>
      </div>

      <TicketUserIdentity user={ticket.user} />

      <div className="flex items-center gap-2 lg:justify-end">
        <Button size="sm" icon={<MessageSquareText size={14} />} onClick={() => navigate(`/tickets/${ticket.id}`)}>باز کردن گفت‌وگو</Button>
        <Button size="sm" variant="secondary" icon={<Settings2 size={14} />} onClick={() => setManageOpen(open => !open)} aria-expanded={manageOpen} aria-label="مدیریت تیکت"><ChevronDown size={13} className={`transition-transform ${manageOpen ? 'rotate-180' : ''}`} /></Button>
      </div>
    </div>

    {manageOpen && <div className="flex flex-wrap items-end gap-3 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/60 px-5 py-3">
      <div className="min-w-[170px]"><Select label="وضعیت" value={ticket.status} options={statusOptions} onChange={event => void onUpdate(ticket, 'status', event.target.value as TicketStatus)} /></div>
      <div className="min-w-[170px]"><Select label="اولویت" value={ticket.priority} options={priorityOptions} onChange={event => void onUpdate(ticket, 'priority', event.target.value as TicketPriority)} /></div>
      <Button size="sm" variant="ghost" className="mr-auto text-rose-500 hover:!bg-rose-500/10" icon={<Trash2 size={14} />} onClick={() => onDelete(ticket)}>حذف تیکت</Button>
    </div>}
  </article>;
}
