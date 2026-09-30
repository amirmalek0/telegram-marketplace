import type { TicketMessage } from '../../features/tickets/types'
import { formatDateTime } from '../../utils/format'

export function TicketMessageBubble({ message }: { message: TicketMessage }) {
  const fromUser = message.sender_type === 'user'

  return (
    <article className={`ticket-message ${fromUser ? 'is-user' : 'is-support'}`}>
      <div className="ticket-message-author">{fromUser ? 'شما' : 'پشتیبانی'}</div>
      <p>{message.message}</p>
      <time dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
    </article>
  )
}
