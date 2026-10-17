import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TicketCard } from '../components/tickets/TicketCard'
import { TicketEmpty, TicketListSkeleton } from '../components/tickets/TicketStates'
import { Icon } from '../components/ui/Icon'
import { ticketStatusLabels } from '../features/tickets/metadata'
import type { TicketStatus } from '../features/tickets/types'
import { useTickets } from '../features/tickets/useTickets'

interface TicketsPageProps {
  initDataRaw: string | null
  ready: boolean
  preview?: boolean
  scenario?: string
}

type TicketFilter = 'all' | TicketStatus

const filters: { value: TicketFilter; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'open', label: ticketStatusLabels.open },
  { value: 'in_progress', label: ticketStatusLabels.in_progress },
  { value: 'closed', label: ticketStatusLabels.closed },
]

export function TicketsPage({ initDataRaw, ready, preview = false, scenario = 'content' }: TicketsPageProps) {
  const { tickets, loading, error, reload } = useTickets(initDataRaw, ready, preview)
  const [filter, setFilter] = useState<TicketFilter>('all')
  const filteredTickets = useMemo(
    () => filter === 'all' ? tickets : tickets.filter((ticket) => ticket.status === filter),
    [filter, tickets],
  )
  const visibleTickets = preview && (scenario === 'empty' || scenario === 'filtered-empty') ? [] : filteredTickets
  const visibleLoading = preview ? scenario === 'loading' : loading
  const visibleError = preview && scenario === 'error' ? 'دریافت تیکت‌ها ناموفق بود' : error
  const hasTickets = preview && scenario === 'empty' ? false : scenario === 'filtered-empty' ? true : tickets.length > 0
  return (
    <div className="page tickets-page">
      <section className="ticket-overview">
        <div className="ticket-overview-copy">
          <span className="ticket-overview-kicker"><Icon name="tickets" size={16} />مرکز پشتیبانی</span>
          <h2>گفت‌وگوهای شما</h2>
        </div>
        <Link to="/tickets/new" className="new-ticket-button pressable">
          <span><Icon name="plus" size={18} /></span>
          <span>تیکت جدید</span>
        </Link>
      </section>

      <div className="ticket-filters" role="group" aria-label="فیلتر وضعیت تیکت‌ها">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            className={filter === item.value ? 'active' : ''}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visibleLoading ? <TicketListSkeleton /> : visibleError ? (
        <section className="ticket-error">
          <Icon name="tickets" size={26} />
          <h3>دریافت تیکت‌ها انجام نشد</h3>
          <p>اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.</p>
          <button type="button" onClick={() => void reload()}>تلاش دوباره</button>
        </section>
      ) : visibleTickets.length > 0 ? (
        <div className="ticket-list">
          {visibleTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      ) : <TicketEmpty filtered={hasTickets} />}
    </div>
  )
}
