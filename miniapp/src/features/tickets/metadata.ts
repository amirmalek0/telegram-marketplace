import type { TicketPriority, TicketStatus } from './types'

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: 'باز',
  in_progress: 'در حال پیگیری',
  closed: 'بسته‌شده',
}

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: 'کم',
  medium: 'معمولی',
  high: 'زیاد',
  urgent: 'فوری',
}

export function ticketCategoryLabel(category: string) {
  return category
}
