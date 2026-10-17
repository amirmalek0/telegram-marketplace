import { AtSign, BadgeCheck, CircleUserRound, Crown, MessageSquareText, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserResponse } from '@/types';
import { formatDate } from '@/utils/format';
import { CustomerIdentity } from '@/components/customers/CustomerIdentity';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';

export function TicketUserIdentity({ user }: { user?: UserResponse }) {
  if (!user) return <span className="text-xs text-[rgb(var(--color-text-muted))]">اطلاعات کاربر موجود نیست</span>;

  return <CustomerIdentity user={user} to={`/users/${user.id}/tickets`} />;
}

export function TicketUserPanel({ user, showTicketsLink = true, compact = false }: { user?: UserResponse; showTicketsLink?: boolean; compact?: boolean }) {
  if (!user) return null;

  const facts = [
    { icon: <AtSign size={14} />, label: 'نام کاربری', value: user.username ? `@${user.username}` : '—', ltr: true },
    { icon: <CircleUserRound size={14} />, label: 'شناسه تلگرام', value: String(user.telegram_id), ltr: true },
    { icon: <Phone size={14} />, label: 'شماره تلفن', value: user.phone_number || '—', ltr: true },
    { icon: <Crown size={14} />, label: 'عضویت', value: user.has_active_plan ? 'VIP فعال' : 'عادی' },
    { icon: <BadgeCheck size={14} />, label: 'عضویت از', value: formatDate(user.created_at) },
  ];

  return (
    <section className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/60 p-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1"><CustomerIdentity user={user} to={`/users?user=${user.id}`} />
            {user.is_banned && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-500">مسدود</span>}
        </div>
        {showTicketsLink && (
          <Link to={`/users/${user.id}/tickets`} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <MessageSquareText size={13} /> همه تیکت‌ها
          </Link>
        )}
      </div>
      <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3'}>
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-xl bg-[rgb(var(--color-surface))] px-3 py-2.5">
            <span className="mb-1 flex items-center gap-1.5 text-xs text-[rgb(var(--color-text-muted))]">{fact.icon}{fact.label}</span>
            {fact.ltr && fact.value !== '—' ? <CopyIdentifier value={fact.value} label={fact.label} full /> : <b className="block text-xs font-medium">{fact.value}</b>}
          </div>
        ))}
      </div>
    </section>
  );
}
