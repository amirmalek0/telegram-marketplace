import type { ReactNode } from 'react';
import { ArrowLeft, ShoppingBag, Ticket, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui';
import { StarsAmount } from '@/components/ui/StarsAmount';
import type { OrderResponse, TicketResponse } from '@/types';
import { formatDateTime, shortId } from '@/utils/format';
import { ticketStatuses } from '../tickets/ticketMeta';

interface Props {
  orders: OrderResponse[];
  tickets: TicketResponse[];
  loading: boolean;
  ordersError: boolean;
  ticketsError: boolean;
}

function ActivityPanel({ title, icon, path, allLabel, loading, error, empty, children }: {
  title: string; icon: ReactNode; path: string; allLabel: string; loading: boolean; error: boolean; empty: boolean; children: ReactNode;
}) {
  return <section className="surface-card dashboard-activity-panel" aria-label={title} aria-busy={loading}>
    <div className="dashboard-activity-header">
      <div className="dashboard-orders-heading"><span>{icon}</span><h2>{title}</h2></div>
      <Link to={path} className="dashboard-activity-all">{allLabel}<ArrowLeft size={14} aria-hidden="true" /></Link>
    </div>
    <div className="dashboard-activity-list">
      {loading ? <div role="status" aria-label="در حال دریافت" className="dashboard-activity-loading">{[0, 1, 2].map(index => <div key={index} className="dashboard-activity-skeleton" />)}</div>
        : error ? <p className="dashboard-activity-empty" role="alert">دریافت اطلاعات ناموفق بود. از «{allLabel}» دوباره بررسی کنید.</p>
        : empty ? <p className="dashboard-activity-empty">{title === 'سفارش‌های اخیر' ? 'هنوز سفارشی ثبت نشده است' : 'هنوز تیکتی ثبت نشده است'}</p>
        : children}
    </div>
  </section>;
}

export function DashboardActivity({ orders, tickets, loading, ordersError, ticketsError }: Props) {
  return <div className="dashboard-activity-grid">
    <ActivityPanel title="سفارش‌های اخیر" icon={<ShoppingBag size={18} aria-hidden="true" />} path="/orders" allLabel="همه سفارش‌ها" loading={loading} error={ordersError} empty={!orders.length}>
      {orders.map(order => <Link key={order.id} to="/orders" className="dashboard-activity-row">
        <span className="dashboard-activity-icon"><ShoppingBag size={17} aria-hidden="true" /></span>
        <div className="dashboard-activity-main">
          <p className="dashboard-activity-title">{order.product_title || <>سفارش <bdi>#{shortId(order.id)}</bdi></>}</p>
          <ActivityPerson label="خریدار" user={order.user} />
          <time dateTime={order.created_at} className="dashboard-activity-meta">{formatDateTime(order.created_at)}</time>
        </div>
        <div className="dashboard-activity-detail">
          <StarsAmount value={order.stars} className="dashboard-activity-price" />
          <OrderBadge status={order.status} />
        </div>
      </Link>)}
    </ActivityPanel>
    <ActivityPanel title="تیکت‌های اخیر" icon={<Ticket size={18} aria-hidden="true" />} path="/tickets" allLabel="همه تیکت‌ها" loading={loading} error={ticketsError} empty={!tickets.length}>
      {tickets.map(ticket => {
        const status = ticketStatuses[ticket.status] || { label: ticket.status, variant: 'default' as const };
        const date = ticket.last_message_at || ticket.created_at;
        return <Link key={ticket.id} to={`/tickets/${ticket.id}`} className="dashboard-activity-row">
          <span className="dashboard-activity-icon dashboard-activity-icon-ticket"><Ticket size={17} aria-hidden="true" /></span>
          <div className="dashboard-activity-main">
            <p className="dashboard-activity-title" title={ticket.subject}>{ticket.subject}</p>
            <ActivityPerson label="درخواست‌دهنده" user={ticket.user} />
            <time dateTime={date} className="dashboard-activity-meta">{formatDateTime(date)}</time>
          </div>
          <div className="dashboard-activity-detail"><Badge variant={status.variant}>{status.label}</Badge></div>
        </Link>;
      })}
    </ActivityPanel>
  </div>;
}

function ActivityPerson({ label, user }: { label: string; user: OrderResponse['user'] }) {
  const fullName = user && [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  const name = fullName || (user?.username ? `@${user.username}` : user?.telegram_id ? `کاربر تلگرام ${user.telegram_id}` : 'اطلاعات کاربر در دسترس نیست');
  return <div className="dashboard-activity-person" title={`${label}: ${name}`}>
    <UserRound size={13} aria-hidden="true" />
    <span className="dashboard-activity-person-label">{label}:</span>
    <bdi className="dashboard-activity-name">{name}</bdi>
  </div>;
}

function OrderBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
    paid: { label: 'موفق', variant: 'success' },
    pending: { label: 'انتظار', variant: 'warning' },
    failed: { label: 'ناموفق', variant: 'error' },
    cancelled: { label: 'لغو', variant: 'default' },
    refunded: { label: 'بازپرداخت', variant: 'default' },
  };
  const value = map[status] || { label: status, variant: 'default' as const };
  return <Badge variant={value.variant}>{value.label}</Badge>;
}
