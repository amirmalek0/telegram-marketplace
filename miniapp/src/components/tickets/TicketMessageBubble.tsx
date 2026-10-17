import type { TicketMessage } from '../../features/tickets/types'

export function TicketMessageBubble({ message }: { message: TicketMessage }) {
  const fromUser = message.sender_type === 'user'

  return (
    <article className={`ticket-message ${fromUser ? 'is-user' : 'is-support'}`}>
      <div className="ticket-message-author">{fromUser ? 'شما' : 'پشتیبانی'}</div>
      <p>{message.message}</p>
      <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</time>
    </article>
  )
}
