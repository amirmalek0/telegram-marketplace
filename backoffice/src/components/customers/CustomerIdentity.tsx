import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import './customers.css';
import { useCustomerPhoto } from './useCustomerPhoto';

export interface Customer { first_name?: string; last_name?: string; username?: string; photo_url?: string; }
export const customerName = (user: Customer) => [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || 'کاربر بدون نام';

export function CustomerIdentity({ user, onClick, onPhotoClick, to, large = false }: { user: Customer; onClick?: () => void; onPhotoClick?: () => void; to?: string; large?: boolean }) {
  const [failedURL, setFailedURL] = useState<string>();
  const { src, loading } = useCustomerPhoto(user.photo_url);
  const photo = src !== failedURL ? src : undefined;
  const avatar = <span className={`customer-avatar ${loading ? 'animate-pulse' : ''}`}>{photo ? <img src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedURL(photo)} /> : <UserRound size={large ? 28 : 21} aria-hidden="true" />}</span>;
  const identity = <span className="customer-identity-text"><b>{customerName(user)}</b><small dir={user.username ? 'ltr' : undefined}>{user.username ? `@${user.username}` : 'بدون نام کاربری'}</small></span>;
  const content = <>{avatar}{identity}</>;
  const className = `customer-identity ${large ? 'customer-identity--large' : ''}`;
  if (onPhotoClick) return <div className={className}><button type="button" className="customer-photo-trigger" onClick={onPhotoClick} aria-label={`تصاویر ${customerName(user)}`}>{avatar}</button>{onClick ? <button type="button" onClick={onClick} className="text-start" aria-label={`پروفایل ${customerName(user)}`}>{identity}</button> : identity}</div>;
  return to ? <Link className={className} to={to}>{content}</Link> : onClick ? <button type="button" className={className} onClick={onClick} aria-label={`پروفایل ${customerName(user)}`}>{content}</button> : <div className={className}>{content}</div>;
}
