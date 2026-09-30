import { Icon } from '../ui/Icon'

export function TicketListSkeleton() {
  return (
    <div className="ticket-list ticket-list-skeleton" aria-label="در حال دریافت تیکت‌ها">
      {[1, 2, 3].map((item) => (
        <div className="ticket-card ticket-skeleton-card" key={item}>
          <div className="skeleton ticket-skeleton-line is-short" />
          <div className="skeleton ticket-skeleton-line" />
          <div className="skeleton ticket-skeleton-line is-tiny" />
        </div>
      ))}
    </div>
  )
}

export function TicketEmpty({ filtered = false }: { filtered?: boolean }) {
  return (
    <section className="ticket-empty">
      <span><Icon name={filtered ? 'search' : 'tickets'} size={28} /></span>
      <h3>{filtered ? 'تیکتی با این وضعیت نیست' : 'هنوز تیکتی ندارید'}</h3>
      <p>{filtered ? 'یک وضعیت دیگر را انتخاب کنید.' : 'هر زمان به کمک نیاز داشتید، برای ما تیکت بفرستید.'}</p>
    </section>
  )
}
