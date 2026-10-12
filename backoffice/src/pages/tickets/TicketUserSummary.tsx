import { AtSign, BadgeCheck, CircleUserRound, Crown, MessageSquareText, Phone, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UserResponse } from '@/types';
import { formatDate, formatMoney } from '@/utils/format';

function displayName(user: UserResponse) {
  return `${user.first_name} ${user.last_name}`.trim() || 'کاربر بدون نام';
}

export function TicketUserIdentity({ user }: { user?: UserResponse }) {
  if (!user) return <span className="text-xs text-[rgb(var(--color-text-muted))]">اطلاعات کاربر موجود نیست</span>;

  return (
    <Link to={`/users/${user.id}/tickets`} className="group flex min-w-[190px] items-center gap-3 rounded-xl p-1.5 transition hover:bg-blue-500/5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-sm font-extrabold text-blue-600">
        {(user.first_name?.[0] || 'U').toUpperCase()}
      </span>
      <span className="min-w-0">
        <b className="block truncate text-xs group-hover:text-blue-600">{displayName(user)}</b>
        <span dir="ltr" className="mt-0.5 block truncate text-right text-[10px] text-[rgb(var(--color-text-muted))]">@{user.username || '—'}</span>
        <span dir="ltr" className="block text-right text-[9px] text-[rgb(var(--color-text-muted))]">{user.telegram_id.toLocaleString('en-US')}</span>
      </span>
    </Link>
  );
}

export function TicketUserPanel({ user, showTicketsLink = true, compact = false }: { user?: UserResponse; showTicketsLink?: boolean; compact?: boolean }) {
  if (!user) return null;

  const facts = [
    { icon: <AtSign size={14} />, label: 'نام کاربری', value: user.username ? `@${user.username}` : '—', ltr: true },
    { icon: <CircleUserRound size={14} />, label: 'شناسه تلگرام', value: user.telegram_id.toLocaleString('en-US'), ltr: true },
    { icon: <Phone size={14} />, label: 'شماره تلفن', value: user.phone_number || '—', ltr: true },
    { icon: <WalletCards size={14} />, label: 'موجودی', value: formatMoney(user.wallet_balance) },
    { icon: <Crown size={14} />, label: 'عضویت', value: user.has_active_plan ? 'VIP فعال' : 'عادی' },
    { icon: <BadgeCheck size={14} />, label: 'عضویت از', value: formatDate(user.created_at) },
  ];

  return (
    <section className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/60 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-base font-extrabold text-blue-600">
          {(user.first_name?.[0] || 'U').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-extrabold">{displayName(user)}</h3>
            {user.is_banned && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-500">مسدود</span>}
          </div>
          <p className="mt-0.5 text-[10px] text-[rgb(var(--color-text-secondary))]">اطلاعات ثبت‌شده کاربر تیکت</p>
        </div>
        {showTicketsLink && (
          <Link to={`/users/${user.id}/tickets`} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[10px] font-bold text-white shadow-lg shadow-blue-600/15">
            <MessageSquareText size={13} /> همه تیکت‌ها
          </Link>
        )}
      </div>
      <div className={compact ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3'}>
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-xl bg-[rgb(var(--color-surface))] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[9px] text-[rgb(var(--color-text-muted))]">{fact.icon}{fact.label}</span>
            <b dir={fact.ltr ? 'ltr' : undefined} className={`mt-1 block truncate text-[10px] ${fact.ltr ? 'text-right' : ''}`}>{fact.value}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
