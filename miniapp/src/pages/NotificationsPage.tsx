import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { useContent } from '../features/content/ContentProvider'
import type { Notification, NotificationsState } from '../features/notifications/useNotifications'
import '../styles/notifications.css'

const previewItems: Notification[] = [
  { id: 'preview-new', title: 'تازه‌های فروشگاه', message: 'محصولات جدید به فروشگاه اضافه شدند. برای دیدن جزئیات، به بخش فروشگاه سر بزنید.', published_at: '2026-10-17T10:00:00Z' },
  { id: 'preview-read', title: 'به فروشگاه خوش آمدید', message: 'خبرها و اطلاعیه‌های فروشگاه را از این بخش دنبال کنید.', published_at: '2026-10-16T10:00:00Z', read_at: '2026-10-16T12:00:00Z' },
]

export function NotificationsPage({ notifications: state, preview = false, scenario = 'content' }: { notifications: NotificationsState; preview?: boolean; scenario?: string }) {
  const { text } = useContent()
  const [expanded, setExpanded] = useState<string | null>(null)
  useEffect(() => { setExpanded(null) }, [state.page, scenario])
  const items = preview ? scenario === 'empty' ? [] : previewItems : state.items
  const loading = preview ? scenario === 'loading' : state.loading
  const error = preview ? scenario === 'error' : state.error
  const unread = preview ? scenario === 'empty' ? 0 : 1 : state.unread

  return <section className="notification-page" dir="rtl">
    <div className="notification-toolbar">
      <span>{text('notifications.inbox')}</span>
      <button type="button" disabled={state.busy || unread === 0 || loading || error} onClick={() => void state.markRead()}><Icon name="check" size={16} />{text('notifications.read_all')}</button>
      <button type="button" className="notification-refresh" disabled={loading} onClick={state.refresh} aria-label={text('common.refresh')}><Icon name="refresh" size={18} /></button>
    </div>
    {state.actionError && !preview && <p className="notification-error" role="alert">{text('notifications.action_error')}</p>}
    {error ? <div className="notification-state" role="alert"><Icon name="alert" size={30} /><p>{text('notifications.error')}</p><button onClick={state.refresh}>{text('common.retry')}</button></div>
      : loading && !items.length || preview && loading ? <div className="notification-loading" aria-label={text('notifications.loading')} aria-busy="true">{[1, 2, 3].map(i => <div className="skeleton" key={i} />)}</div>
      : !items.length ? <div className="notification-state"><span className="notification-empty-icon"><Icon name="bell" size={32} /></span><h2>{text('notifications.empty')}</h2><p>{text('notifications.empty_hint')}</p></div>
      : <div className="notification-list">{items.map(item => {
        const open = expanded === item.id
        return <article key={item.id} className={`notification-card ${item.read_at ? '' : 'is-unread'}`}>
          <button className="notification-summary" aria-expanded={open} aria-controls={`notification-${item.id}`} onClick={() => {
            setExpanded(open ? null : item.id)
            if (!item.read_at) void state.markRead(item.id)
          }}>
            <span className="notification-symbol"><Icon name="bell" size={19} /></span>
            <span className="notification-copy"><strong>{item.title}</strong><span className="notification-meta"><time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' })}</time>{!item.read_at && <span>{text('notifications.new')}</span>}</span></span>
            <Icon name="arrow" size={16} />
          </button>
          <div id={`notification-${item.id}`} hidden={!open} className="notification-body"><p>{item.message}</p>{!item.read_at && !preview && <button disabled={state.busy} onClick={() => void state.markRead(item.id)}>{text('notifications.mark_read')}</button>}</div>
        </article>
      })}</div>}
    {!preview && !error && state.pages > 1 && <nav className="notification-pagination" aria-label={text('notifications.pages')}><button disabled={loading || state.page <= 1} onClick={() => state.setPage(state.page - 1)}>{text('notifications.previous')}</button><span>{state.page.toLocaleString('fa-IR')} / {state.pages.toLocaleString('fa-IR')}</span><button disabled={loading || state.page >= state.pages} onClick={() => state.setPage(state.page + 1)}>{text('notifications.next')}</button></nav>}
  </section>
}
