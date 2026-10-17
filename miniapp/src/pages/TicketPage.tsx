import { FormEvent, Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TicketMessageBubble } from '../components/tickets/TicketMessageBubble'
import { TicketStatusBadge } from '../components/tickets/TicketStatusBadge'
import { Icon } from '../components/ui/Icon'
import { ticketCategoryLabel, ticketPriorityLabels } from '../features/tickets/metadata'
import { TicketApi } from '../features/tickets/ticketApi'
import { startTicketPolling } from '../features/tickets/ticketPolling'
import type { TicketWithMessages } from '../features/tickets/types'
import { editorTicketThread } from '../features/content/editorFixtures'
import { formatDate, formatDateTime } from '../utils/format'

interface TicketPageProps {
  initDataRaw: string | null
  ready: boolean
  preview?: boolean
  scenario?: string
}

export function TicketPage({ initDataRaw, ready, preview = false, scenario = 'open' }: TicketPageProps) {
  const { ticketId } = useParams()
  const api = useMemo(() => initDataRaw ? new TicketApi(initDataRaw) : null, [initDataRaw])
  const [thread, setThread] = useState<TicketWithMessages | null>(null)
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const pollerRef = useRef<ReturnType<typeof startTicketPolling> | null>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    setThread(null)
    setReply('')
    setLoading(true)
    setSending(false)
    sendingRef.current = false
    if (preview && ticketId) {
      setThread(editorTicketThread(ticketId))
      setError(null)
      setLoading(false)
      return
    }
    if (!api || !ready || !ticketId) return
    const poller = startTicketPolling({
      fetchTicket: signal => api.getTicket(ticketId, signal),
      onUpdate: setThread,
      onLoading: setLoading,
      onLoadError: setError,
    })
    pollerRef.current = poller
    return () => {
      poller.stop()
      pollerRef.current = null
    }
  }, [api, preview, ready, ticketId])

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanReply = reply.trim()
    if (!ticketId || !thread || thread.ticket.status === 'closed' || !cleanReply || sendingRef.current) return

    if (preview) {
      setThread((current) => current ? {
        ...current,
        messages: [...current.messages, {
          id: `preview-message-${current.messages.length + 1}`,
          ticket_id: ticketId,
          sender_type: 'user',
          sender_id: 'preview-user',
          message: cleanReply,
          created_at: new Date().toISOString(),
        }],
      } : current)
      setReply('')
      window.requestAnimationFrame(() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
      return
    }

    if (!api) return

    const poller = pollerRef.current
    sendingRef.current = true
    // An older GET must not overwrite the newly submitted message.
    poller?.pause()
    setSending(true)
    setError(null)
    try {
      const message = await api.addMessage(ticketId, cleanReply)
      if (pollerRef.current !== poller) return
      setThread((current) => current ? { ...current, messages: [...current.messages, message] } : current)
      setReply('')
      window.requestAnimationFrame(() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
    } catch {
      if (pollerRef.current !== poller) return
      setError('ارسال پیام انجام نشد. دوباره تلاش کنید.')
    } finally {
      if (pollerRef.current === poller) {
        sendingRef.current = false
        setSending(false)
        poller?.resume()
      }
    }
  }

  const previewThread = preview && scenario === 'closed'
    ? editorTicketThread('preview-ticket-closed')
    : thread
  const visibleThread = preview && scenario === 'error' ? null : previewThread
  const visibleLoading = preview ? scenario === 'loading' : loading || !ready
  const visibleError = preview && scenario === 'error' ? 'این گفت‌وگو در دسترس نیست یا دریافت آن ناموفق بود.' : error

  if (visibleLoading) {
    return (
      <div className="page ticket-thread-page">
        <div className="skeleton ticket-detail-skeleton is-head" />
        <div className="skeleton ticket-detail-skeleton" />
        <div className="skeleton ticket-detail-skeleton is-message" />
      </div>
    )
  }

  if (!visibleThread) {
    return (
      <div className="page ticket-thread-page">
        <section className="ticket-error">
          <Icon name="tickets" size={26} />
          <h3>گفت‌وگو پیدا نشد</h3>
          <p>{visibleError || 'امکان نمایش این تیکت وجود ندارد.'}</p>
          <button type="button" onClick={() => void pollerRef.current?.refresh()}>تلاش دوباره</button>
        </section>
      </div>
    )
  }

  const { ticket, messages } = visibleThread
  const isClosed = ticket.status === 'closed'

  return (
    <div className={`page ticket-thread-page ${isClosed ? 'is-closed' : 'has-fixed-reply'}`}>
      <section className="ticket-thread-summary">
        <div className="ticket-thread-overline"><span><Icon name="tickets" size={16} />گفت‌وگوی پشتیبانی</span><TicketStatusBadge status={ticket.status} /></div>
        <h2>{ticket.subject}</h2>
        <div className="ticket-thread-heading">
          <span><small>موضوع</small><b>{ticketCategoryLabel(ticket.category)}</b></span>
          <span><small>اولویت</small><b className={`priority-${ticket.priority}`}>{ticketPriorityLabels[ticket.priority]}</b></span>
        </div>
        <details className="ticket-thread-details"><summary>جزئیات درخواست<Icon name="back" size={14} /></summary><span>تاریخ ایجاد<time dateTime={ticket.created_at}>{formatDateTime(ticket.created_at)}</time></span></details>
      </section>

      <div className="conversation-heading">
        <div><span>گفت‌وگو</span><small>پشتیبانی و شما</small></div>
        <span className="conversation-count">{messages.length.toLocaleString('fa-IR')}</span>
      </div>

      <section className="ticket-conversation" aria-label="پیام‌های تیکت">
        {messages.map((message, index) => <Fragment key={message.id}>{(index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(message.created_at)) && <div className="ticket-day-divider"><time dateTime={message.created_at}>{formatDate(message.created_at)}</time></div>}<TicketMessageBubble message={message} /></Fragment>)}
        <div ref={messageEndRef} />
      </section>

      {isClosed ? (
        <section className="ticket-closed-note">
          <Icon name="check" size={20} />
          <div><strong>این گفت‌وگو بسته شده است</strong><span>برای موضوع جدید، یک تیکت تازه ثبت کنید.</span></div>
          <Link to="/tickets/new" aria-label="تیکت جدید"><Icon name="plus" size={20} /></Link>
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
              disabled={sending}
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
