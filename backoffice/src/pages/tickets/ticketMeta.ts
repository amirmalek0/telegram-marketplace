import type { TicketPriority, TicketStatus } from '@/types';

export const ticketStatuses: Record<TicketStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  open: { label: 'باز', variant: 'success' },
  in_progress: { label: 'در حال بررسی', variant: 'warning' },
  closed: { label: 'بسته', variant: 'default' },
};

export const ticketPriorities: Record<TicketPriority, { label: string; variant: 'default' | 'info' | 'warning' | 'error' }> = {
  low: { label: 'کم', variant: 'default' },
  medium: { label: 'متوسط', variant: 'info' },
  high: { label: 'زیاد', variant: 'warning' },
  urgent: { label: 'فوری', variant: 'error' },
};

export const statusOptions = Object.entries(ticketStatuses).map(([value, item]) => ({ value, label: item.label }));
export const priorityOptions = Object.entries(ticketPriorities).map(([value, item]) => ({ value, label: item.label }));
