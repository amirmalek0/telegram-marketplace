import { ticketStatusLabels } from '../../features/tickets/metadata'
import type { TicketStatus } from '../../features/tickets/types'

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <span className={`ticket-status status-${status}`}><small>وضعیت</small>{ticketStatusLabels[status]}</span>
}
