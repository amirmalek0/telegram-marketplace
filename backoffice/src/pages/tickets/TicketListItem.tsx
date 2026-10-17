import { useState } from 'react';
import { ChevronDown, Clock3, MessageSquareText, Settings2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { TicketPriority, TicketResponse, TicketStatus } from '@/types';
import { Badge, Button, Select } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
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
  const [updating, setUpdating] = useState(false);
  const update = async (field: 'status' | 'priority', value: string) => {
    if (updating) return;
    setUpdating(true);
    try { await onUpdate(ticket, field, value); } finally { setUpdating(false); }
  };
  const status = ticketStatuses[ticket.status];
  const priority = ticketPriorities[ticket.priority];

  return <article className="border-b border-[rgb(var(--color-border))] last:border-0">
    <div className="support-ticket">
      <div className="min-w-0">
        <Link to={`/tickets/${ticket.id}`} className="support-ticket-title">{ticket.subject}</Link>
        <div className="support-ticket-meta">
          <Badge variant={status.variant} dot>{status.label}</Badge>
          <Badge variant={priority.variant}>{`اولویت ${priority.label}`}</Badge>
          <span>موضوع: {ticket.category || 'عمومی'}</span>
        </div>
        <div className="support-ticket-meta">
          <span className="flex items-center gap-1.5"><Clock3 size={14} />آخرین پیام: {formatDateTime(ticket.last_message_at)}</span>
          <CopyIdentifier value={ticket.id} label="شناسه تیکت" />
        </div>
      </div>

      <TicketUserIdentity user={ticket.user} />

      <div className="support-ticket-actions">
        <Button size="sm" variant="secondary" icon={<MessageSquareText size={15} />} onClick={() => navigate(`/tickets/${ticket.id}`)}>گفت‌وگو</Button>
        <Button size="sm" variant="secondary" icon={<Settings2 size={14} />} onClick={() => setManageOpen(open => !open)} aria-expanded={manageOpen} aria-label="مدیریت تیکت"><ChevronDown size={13} className={`transition-transform ${manageOpen ? 'rotate-180' : ''}`} /></Button>
      </div>
    </div>

    {manageOpen && <div className="flex flex-wrap items-end gap-3 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/60 px-5 py-3">
      <div className="min-w-[170px]"><Select label="وضعیت" disabled={updating} value={ticket.status} options={statusOptions} onChange={event => void update('status', event.target.value as TicketStatus)} /></div>
      <div className="min-w-[170px]"><Select label="اولویت" disabled={updating} value={ticket.priority} options={priorityOptions} onChange={event => void update('priority', event.target.value as TicketPriority)} /></div>
      <Button size="sm" variant="ghost" disabled={updating} className="mr-auto text-rose-500 hover:!bg-rose-500/10" icon={<Trash2 size={14} />} onClick={() => onDelete(ticket)}>حذف تیکت</Button>
    </div>}
  </article>;
}
