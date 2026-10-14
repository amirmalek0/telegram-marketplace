import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ticketsApi, usersApi } from '@/api';
import { Badge, Button, DataTable, PageHeader, Select } from '@/components/ui';
import type { Column } from '@/components/ui';
import type { TicketPriority, TicketResponse, TicketStatus, UserResponse } from '@/types';
import { formatDateTime, shortId } from '@/utils/format';
import { TicketUserPanel } from './TicketUserSummary';

const statuses: Record<TicketStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  open: { label: 'باز', variant: 'success' },
  in_progress: { label: 'در حال بررسی', variant: 'warning' },
  closed: { label: 'بسته', variant: 'default' },
};

const priorities: Record<TicketPriority, { label: string; variant: 'default' | 'info' | 'warning' | 'error' }> = {
  low: { label: 'کم', variant: 'default' },
  medium: { label: 'متوسط', variant: 'info' },
  high: { label: 'زیاد', variant: 'warning' },
  urgent: { label: 'فوری', variant: 'error' },
};

export default function UserTicketsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [rows, setRows] = useState<TicketResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    usersApi.get(userId, controller.signal)
      .then(setUser)
      .catch((error) => {
        if (error?.code !== 'ERR_CANCELED') toast.error('اطلاعات کاربر دریافت نشد');
      });
    return () => controller.abort();
  }, [userId]);

  const loadTickets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await ticketsApi.list({
        page,
        per_page: 20,
        user_id: userId,
        ...(status && { status }),
        ...(priority && { priority }),
      });
      setRows(response.data);
      setTotal(response.total);
    } catch {
      toast.error('تیکت‌های کاربر دریافت نشد');
    } finally {
      setLoading(false);
    }
  }, [page, priority, status, userId]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const columns: Column<TicketResponse>[] = [
    { key: 'subject', title: 'موضوع', render: (value, row) => <div><b>{String(value)}</b><p className="mt-1 text-[10px] text-[rgb(var(--color-text-muted))]">#{shortId(row.id)}</p></div> },
    { key: 'category', title: 'دسته', render: value => <Badge>{String(value)}</Badge> },
    { key: 'priority', title: 'اولویت', render: value => <Badge variant={priorities[value as TicketPriority].variant} dot>{priorities[value as TicketPriority].label}</Badge> },
    { key: 'status', title: 'وضعیت', render: value => <Badge variant={statuses[value as TicketStatus].variant} dot>{statuses[value as TicketStatus].label}</Badge> },
    { key: 'last_message_at', title: 'آخرین پیام', render: value => <span className="text-xs">{formatDateTime(value as string)}</span> },
    { key: 'actions', title: 'گفت‌وگو', render: (_, row) => <Button size="sm" variant="ghost" icon={<MessageSquareText size={14} />} onClick={() => navigate(`/tickets/${row.id}`)}>مشاهده</Button> },
  ];

  const name = user ? `${user.first_name} ${user.last_name}`.trim() || 'کاربر بدون نام' : 'کاربر';

  return (
    <div>
      <PageHeader
        title={`تیکت‌های ${name}`}
        action={<Button variant="secondary" icon={<ArrowRight size={15} />} onClick={() => navigate('/users')}>بازگشت به کاربران</Button>}
      />

      {user && <div className="mb-5"><TicketUserPanel user={user} showTicketsLink={false} /></div>}

      <div className="filter-bar">
        <Select
          aria-label="فیلتر وضعیت"
          value={status}
          onChange={event => { setStatus(event.target.value as TicketStatus | ''); setPage(1); }}
          options={[{ value: '', label: 'همه وضعیت‌ها' }, ...Object.entries(statuses).map(([value, item]) => ({ value, label: item.label }))]}
        />
        <Select
          aria-label="فیلتر اولویت"
          value={priority}
          onChange={event => { setPriority(event.target.value as TicketPriority | ''); setPage(1); }}
          options={[{ value: '', label: 'همه اولویت‌ها' }, ...Object.entries(priorities).map(([value, item]) => ({ value, label: item.label }))]}
        />
        <Badge variant="info">{total.toLocaleString('fa-IR')} تیکت</Badge>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        keyExtractor={row => row.id}
        pagination={{ page, perPage: 20, total, onPageChange: setPage }}
        emptyMessage="این کاربر تیکتی با فیلترهای انتخاب‌شده ندارد"
      />
    </div>
  );
}
