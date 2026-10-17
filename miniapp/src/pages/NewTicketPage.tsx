import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { ticketCategoryLabel, ticketPriorityLabels } from '../features/tickets/metadata'
import { TicketApi } from '../features/tickets/ticketApi'
import type { TicketCategory, TicketPriority } from '../features/tickets/types'
import { editorTicketCategories } from '../features/content/editorFixtures'

interface NewTicketPageProps {
  initDataRaw: string | null
  ready: boolean
  preview?: boolean
  scenario?: string
}

const priorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent']

export function NewTicketPage({ initDataRaw, ready, preview = false, scenario = 'form' }: NewTicketPageProps) {
  const navigate = useNavigate()
  const api = useMemo(() => initDataRaw ? new TicketApi(initDataRaw) : null, [initDataRaw])
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [message, setMessage] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categoryRevision, setCategoryRevision] = useState(0)

  useEffect(() => {
    if (preview) {
      setCategories(editorTicketCategories)
      setCategory(editorTicketCategories[0].name)
      setLoadingCategories(false)
      setError(null)
      return
    }
    if (!api || !ready) return
    let active = true

    async function loadCategories() {
      setLoadingCategories(true)
      setError(null)
      try {
        const response = await api!.listCategories()
        if (!active) return
        setCategories(response.data)
        const defaultCategory = response.data.find((item) => item.name === 'general') || response.data[0]
        setCategory(defaultCategory?.name || '')
      } catch {
        if (active) setError('دسته‌بندی‌های پشتیبانی دریافت نشد. دوباره تلاش کنید.')
      } finally {
        if (active) setLoadingCategories(false)
      }
    }

    void loadCategories()
    return () => { active = false }
  }, [api, preview, ready, categoryRevision])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanSubject = subject.trim()
    const cleanMessage = message.trim()
    if (submitting || !category || cleanSubject.length < 3 || !cleanMessage) return

    if (preview) {
      navigate('/tickets/preview-ticket-open', { replace: true })
      return
    }

    if (!api) return

    setSubmitting(true)
    setError(null)
    try {
      const ticket = await api.createTicket({ subject: cleanSubject, category, priority, message: cleanMessage })
      navigate(`/tickets/${ticket.id}`, { replace: true })
    } catch {
      setError('ثبت تیکت انجام نشد. لطفاً چند لحظه دیگر دوباره تلاش کنید.')
    } finally {
      setSubmitting(false)
    }
  }

  const visibleCategories = preview && scenario === 'empty' ? [] : categories
  const visibleLoadingCategories = preview ? scenario === 'loading' : loadingCategories
  const visibleSubmitting = preview ? scenario === 'submitting' : submitting
  const visibleError = preview && scenario === 'error' ? 'دسته‌بندی‌های پشتیبانی دریافت نشد. دوباره تلاش کنید.' : error
  const visibleCategory = preview && (scenario === 'empty' || scenario === 'loading' || scenario === 'error') ? '' : category

  return (
    <div className="page new-ticket-page">
      <section className="ticket-form-intro">
        <span><Icon name="tickets" size={20} /></span>
        <div>
          <h2>درخواست جدید</h2>
          <p>جزئیات بیشتر، پاسخ دقیق‌تر و سریع‌تری به همراه دارد.</p>
        </div>
      </section>

      <form className="ticket-form" onSubmit={handleSubmit} aria-busy={visibleSubmitting}>
        <section className="ticket-form-section">
          <div className="ticket-form-section-title"><span>جزئیات درخواست</span><small>ضروری</small></div>
          <div className="ticket-fields-group">
            <label className="ticket-field">
              <span>موضوع</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                minLength={3}
                maxLength={200}
                placeholder="مثلاً مشکل در دریافت فایل"
                required
                disabled={visibleSubmitting}
              />
              <small>{subject.length.toLocaleString('fa-IR')} / ۲۰۰</small>
            </label>

            <label className="ticket-field">
              <span>دسته‌بندی</span>
              <select
                value={visibleCategory}
                onChange={(event) => setCategory(event.target.value)}
                disabled={visibleSubmitting || visibleLoadingCategories || visibleCategories.length === 0}
                required
              >
                {visibleLoadingCategories && <option value="">در حال دریافت...</option>}
                {!visibleLoadingCategories && visibleCategories.length === 0 && <option value="">دسته‌بندی موجود نیست</option>}
                {visibleCategories.map((item) => (
                  <option key={item.id} value={item.name}>{ticketCategoryLabel(item.name)}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="ticket-form-section">
          <div className="ticket-form-section-title"><span>میزان اهمیت</span><small>اولویت پاسخ</small></div>
          <fieldset className="ticket-priority-field" aria-label="میزان اهمیت" disabled={visibleSubmitting}>
            <div className="priority-options">
              {priorities.map((item) => (
                <label key={item} className={`priority-option priority-${item} ${priority === item ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="priority"
                    value={item}
                    checked={priority === item}
                    onChange={() => setPriority(item)}
                  />
                  <span>{ticketPriorityLabels[item]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="ticket-form-section">
          <div className="ticket-form-section-title"><span>پیام شما</span><small>کامل و روشن</small></div>
          <div className="ticket-fields-group">
            <label className="ticket-field ticket-message-field">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                aria-label="پیام شما"
                disabled={visibleSubmitting}
                placeholder="جزئیات درخواست یا مشکلتان را بنویسید..."
                required
              />
            </label>
          </div>
        </section>

        {visibleError && <div className="ticket-form-error" role="alert">{visibleError}{!visibleLoadingCategories && categories.length === 0 && <button type="button" onClick={() => setCategoryRevision(value => value + 1)}>تلاش دوباره</button>}</div>}

        <button
          className="ticket-submit-button pressable"
          type="submit"
          disabled={visibleSubmitting || visibleLoadingCategories || !visibleCategory || subject.trim().length < 3 || !message.trim()}
        >
          {visibleSubmitting ? <span className="button-spinner" /> : <Icon name="send" size={19} />}
          <span>{visibleSubmitting ? 'در حال ارسال...' : 'ارسال تیکت'}</span>
        </button>
        <p className="ticket-submit-hint">پس از ارسال، پاسخ پشتیبانی در همین بخش نمایش داده می‌شود.</p>
      </form>
    </div>
  )
}
