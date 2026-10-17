import { ArrowUpLeft, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { OrderResponse } from '@/types';

export function OrderCustomer({ user }: Pick<OrderResponse, 'user'>) {
  if (!user) return <span className="text-xs text-[rgb(var(--color-text-secondary))]">اطلاعات کاربر در دسترس نیست</span>;
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || `کاربر تلگرام ${user.telegram_id}`;
  return <Link to={`/users?user=${encodeURIComponent(user.id)}`} className="order-customer" aria-label={`مشاهده پروفایل ${name}`}>
    <span className="order-customer-avatar"><UserRound size={18} aria-hidden="true" /></span>
    <span className="min-w-0"><b>{name}</b><small dir="ltr">{user.username ? `@${user.username}` : String(user.telegram_id)}</small></span>
    <ArrowUpLeft size={13} className="shrink-0" aria-hidden="true" />
  </Link>;
}
