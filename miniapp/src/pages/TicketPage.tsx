import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TicketMessageBubble } from '../components/tickets/TicketMessageBubble'
import { TicketStatusBadge } from '../components/tickets/TicketStatusBadge'
import { Icon } from '../components/ui/Icon'
import { ticketCategoryLabel, ticketPriorityLabels } from '../features/tickets/metadata'
import { TicketApi } from '../features/tickets/ticketApi'
import type { TicketWithMessages } from '../features/tickets/types'
import { formatDateTime } from '../utils/format'

interface TicketPageProps {
  initDataRaw: string | null
  ready: boolean
}

export function TicketPage({ initDataRaw, ready }: TicketPageProps) {
  const { ticketId } = useParams()
  const api = useMemo(() => initDataRaw ? new TicketApi(initDataRaw) : null, [initDataRaw])
  const [thread, setThread] = useState<TicketWithMessages | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    if (!api || !ready || !ticketId) return
    setLoading(true)
    setError(null)
    try {
      setThread(await api.getTicket(ticketId))
    } catch {
      setError('این گفت‌وگو در دسترس نیست یا دریافت آن ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [api, ready, ticketId])

  useEffect(() => { void loadTicket() }, [loadTicket])

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanReply = reply.trim()
    if (!api || !ticketId || !thread || thread.ticket.status === 'closed' || !cleanReply) return

    setSending(true)
    setError(null)
    try {
      const message = await api.addMessage(ticketId, cleanReply)
      setThread((current) => current ? { ...current, messages: [...current.messages, message] } : current)
      setReply('')
      window.requestAnimationFrame(() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
    } catch {
      setError('ارسال پیام انجام نشد. دوباره تلاش کنید.')
    } finally {
      setSending(false)
    }
  }

  if (loading || !ready) {
    return (
      <div className="page ticket-thread-page">
        <div className="skeleton ticket-detail-skeleton is-head" />
        <div className="skeleton ticket-detail-skeleton" />
        <div className="skeleton ticket-detail-skeleton is-message" />
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="page ticket-thread-page">
        <section className="ticket-error">
          <Icon name="tickets" size={26} />
          <h3>گفت‌وگو پیدا نشد</h3>
          <p>{error || 'امکان نمایش این تیکت وجود ندارد.'}</p>
          <button type="button" onClick={() => void loadTicket()}>تلاش دوباره</button>
        </section>
      </div>
    )
  }

  const { ticket, messages } = thread
  const isClosed = ticket.status === 'closed'

  return (
    <div className="page ticket-thread-page">
      <section className="ticket-thread-summary">
        <div className="ticket-thread-overline"><span>{ticketCategoryLabel(ticket.category)}</span><time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time></div>
        <h2>{ticket.subject}</h2>
        <div className="ticket-thread-heading">
          <TicketStatusBadge status={ticket.status} />
          <span className={`ticket-priority priority-${ticket.priority}`}>{ticketPriorityLabels[ticket.priority]}</span>
        </div>
      </section>

      <div className="conversation-heading">
        <div><span>گفت‌وگو</span><small>پشتیبانی و شما</small></div>
        <span className="conversation-count">{messages.length.toLocaleString('fa-IR')}</span>
      </div>

      <section className="ticket-conversation" aria-label="پیام‌های تیکت">
        {messages.map((message) => <TicketMessageBubble key={message.id} message={message} />)}
        <div ref={messageEndRef} />
      </section>

      {isClosed ? (
        <section className="ticket-closed-note">
          <Icon name="check" size={20} />
          <div><strong>این گفت‌وگو بسته شده است</strong><span>برای موضوع جدید، یک تیکت تازه ثبت کنید.</span></div>
        </section>
      ) : (
        <form className="ticket-reply" onSubmit={handleReply}>
          <label htmlFor="ticket-reply">پاسخ شما</label>
          <div className="ticket-reply-control">
            <textarea
              id="ticket-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={2}
              placeholder="پیام خود را بنویسید..."
              required
            />
            <button type="submit" className="ticket-reply-button pressable" disabled={sending || !reply.trim()} aria-label="ارسال پاسخ">
              {sending ? <span className="button-spinner" /> : <Icon name="send" size={18} />}
            </button>
          </div>
          {error && <div className="ticket-form-error" role="alert">{error}</div>}
        </form>
      )}
    </div>
  )
}
