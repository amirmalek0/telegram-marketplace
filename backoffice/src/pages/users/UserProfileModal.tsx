import type { FormEvent } from 'react';
import { MessageSquareText, UserRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { UpdateUserRequest, UserResponse } from '@/types';
import { Badge, Button, Input } from '@/components/ui';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { CustomerIdentity } from '@/components/customers/CustomerIdentity';
import { StarsAmount } from '@/components/ui/StarsAmount';

interface Props { user: UserResponse | null; loading: boolean; error: boolean; open: boolean; saving: boolean; form: UpdateUserRequest; onChange: (form: UpdateUserRequest) => void; onClose: () => void; onSubmit: (event: FormEvent) => void; onRetry: () => void; onPhotos: () => void; }
export function UserProfileModal({ user, loading, error, open, saving, form, onChange, onClose, onSubmit, onRetry, onPhotos }: Props) {
  return <CatalogModal isOpen={open} onClose={onClose} title="پروفایل کاربر" size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>بستن</Button><Button type="submit" form="user-profile-form" disabled={!user || loading || error} loading={saving}>ذخیره</Button></>}>
    {loading ? <p role="status" className="customer-inline-error">در حال دریافت پروفایل…</p> : error ? <div role="alert" className="customer-inline-error"><p>پروفایل کاربر دریافت نشد</p><Button onClick={onRetry} variant="secondary">تلاش دوباره</Button></div> : user && <form id="user-profile-form" onSubmit={onSubmit}><fieldset disabled={saving} className="space-y-6">
      <div className="customer-profile-hero"><CustomerIdentity user={user} large onPhotoClick={onPhotos} /><Badge variant={user.is_banned ? 'error' : 'success'} dot>{user.is_banned ? 'مسدود' : 'فعال'}</Badge><div className="customer-profile-actions"><Link to={`/users/${user.id}/tickets`} className="inline-flex items-center gap-2 text-xs text-blue-600"><MessageSquareText size={15} />تیکت‌های کاربر</Link><span className="inline-flex items-center gap-2 text-xs"><WalletCards size={15} /><StarsAmount value={user.wallet_balance || 0} /></span></div></div>
      <CatalogFormSection title="اطلاعات حساب" icon={UserRound}><div className="customer-form-grid"><Input label="نام" placeholder="نام کاربر" value={form.first_name || ''} onChange={e => onChange({ ...form, first_name: e.target.value })} /><Input label="نام خانوادگی" placeholder="نام خانوادگی" value={form.last_name || ''} onChange={e => onChange({ ...form, last_name: e.target.value })} /></div><Input label="نام کاربری" dir="ltr" placeholder="username" value={form.username || ''} onChange={e => onChange({ ...form, username: e.target.value })} /><Input label="شماره تلفن" type="tel" dir="ltr" placeholder="+989123456789" hint="تغییر شماره، تأیید قبلی آن را لغو می‌کند." value={form.phone_number || ''} onChange={e => onChange({ ...form, phone_number: e.target.value })} /></CatalogFormSection>
    </fieldset></form>}
  </CatalogModal>;
}
