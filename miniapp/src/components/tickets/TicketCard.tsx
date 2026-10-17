import { Link } from 'react-router-dom'
import { ticketCategoryLabel, ticketPriorityLabels } from '../../features/tickets/metadata'
import { TicketStatusBadge } from './TicketStatusBadge'
import type { Ticket } from '../../features/tickets/types'
import { formatDateTime } from '../../utils/format'
import { Icon } from '../ui/Icon'

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link to={`/tickets/${ticket.id}`} className={`ticket-card status-${ticket.status} pressable`}>
      <div className="ticket-card-overline"><TicketStatusBadge status={ticket.status} /><time dateTime={ticket.last_message_at}>{formatDateTime(ticket.last_message_at)}</time></div>
      <div className="ticket-card-top">
        <span className={`ticket-card-icon status-${ticket.status}`}><Icon name="tickets" size={19} /></span>
        <div className="ticket-card-main">
          <h3>{ticket.subject}</h3>
        </div>
        <span className="ticket-card-arrow"><Icon name="arrow" size={16} /></span>
      </div>
      <div className="ticket-card-facts">
        <span className="ticket-card-fact category-fact"><small>موضوع</small><b>{ticketCategoryLabel(ticket.category)}</b></span>
        <span className={`ticket-card-fact priority-fact priority-${ticket.priority}`}><small>اولویت</small><b>{ticketPriorityLabels[ticket.priority]}</b></span>
      </div>
    </Link>
  )
}
