import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Crown, MessageSquareText, Pencil, Trash2, UsersRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usersApi } from '@/api';
import type { UpdateUserRequest, UserResponse } from '@/types';
import { Badge, Button, ConfirmationModal, Toggle } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CustomerIdentity, customerName } from '@/components/customers/CustomerIdentity';
import { CustomerPhone } from '@/components/customers/CustomerPhone';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { formatDate } from '@/utils/format';
import { UserProfileModal } from './UserProfileModal';
import { UserPhotoGallery } from '@/components/customers/UserPhotoGallery';
import '@/components/finance/finance.css';

const profileForm = (user: UserResponse): UpdateUserRequest => ({ first_name: user.first_name, last_name: user.last_name, username: user.username, phone_number: user.phone_number });
export default function UsersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserID = searchParams.get('user');
  const [rows, setRows] = useState<UserResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [photoUser, setPhotoUser] = useState<UserResponse | null>(null);
  const [deleting, setDeleting] = useState<UserResponse | null>(null);
  const [changingAccess, setChangingAccess] = useState<UserResponse | null>(null);
  const [form, setForm] = useState<UpdateUserRequest>({});
  const [saving, setSaving] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileRevision, setProfileRevision] = useState(0);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setError(false);
    try { const result = await usersApi.list({ page, per_page: 20 }); if (current !== request.current) return; setRows(result.data); setTotal(result.total); }
    catch { if (current === request.current) setError(true); }
    finally { if (current === request.current) setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const closeProfile = () => {
    setEditing(null); setProfileLoading(false); setProfileError(false);
    if (selectedUserID) setSearchParams(params => { params.delete('user'); return params; }, { replace: true });
  };
  const begin = (user: UserResponse) => { setEditing(user); setForm(profileForm(user)); setProfileError(false); };
  useEffect(() => {
    if (!selectedUserID) return;
    const controller = new AbortController();
    setProfileLoading(true); setProfileError(false); setEditing(null); setForm({});
    usersApi.get(selectedUserID, controller.signal).then(user => {
      if (!controller.signal.aborted) { setEditing(user); setForm(profileForm(user)); }
    }).catch(() => { if (!controller.signal.aborted) setProfileError(true); })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false); });
    return () => controller.abort();
  }, [selectedUserID, profileRevision]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || saving) return;
    setSaving(true);
    try { const updated = await usersApi.update(editing.id, form); setRows(items => items.map(item => item.id === updated.id ? updated : item)); closeProfile(); toast.success('پروفایل کاربر ویرایش شد'); }
    catch { toast.error('ویرایش کاربر ناموفق بود'); } finally { setSaving(false); }
  };
  const changeAccess = async () => {
    if (!changingAccess || saving) return; setSaving(true);
    try { await usersApi.setBanned(changingAccess.id, !changingAccess.is_banned); setRows(items => items.map(item => item.id === changingAccess.id ? { ...item, is_banned: !item.is_banned } : item)); toast.success(changingAccess.is_banned ? 'محدودیت کاربر برداشته شد' : 'کاربر مسدود شد'); setChangingAccess(null); }
    catch { toast.error('تغییر وضعیت کاربر ناموفق بود'); } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!deleting || saving) return; setSaving(true);
    try { await usersApi.delete(deleting.id); setDeleting(null); toast.success('کاربر حذف شد'); void load(); }
    catch { toast.error('حذف کاربر ناموفق بود'); } finally { setSaving(false); }
  };
  const columns: Column<UserResponse>[] = [
    { key: 'first_name', title: 'کاربر', render: (_, row) => <CustomerIdentity user={row} onClick={() => begin(row)} onPhotoClick={() => setPhotoUser(row)} /> },
    { key: 'phone_number', title: 'شماره تلفن', render: (_, row) => <div className="finance-stack"><CustomerPhone value={row.phone_number} />{row.phone_number && row.phone_verified_at && <span className="finance-muted text-emerald-600">تأییدشده</span>}</div> },
    { key: 'wallet_balance', title: 'کیف پول', render: value => <span className="finance-amount"><StarsAmount value={Number(value || 0)} /></span> },
    { key: 'has_active_plan', title: 'اشتراک', render: (_, row) => <div className="finance-stack">{row.has_active_plan ? <><Badge variant="purple"><Crown size={12} />VIP فعال</Badge>{row.plan_expire_at && <span className="finance-muted">تا {formatDate(row.plan_expire_at)}</span>}</> : <Badge>عادی</Badge>}</div> },
    { key: 'is_banned', title: 'دسترسی', render: (_, row) => <Toggle size="sm" checked={!row.is_banned} onChange={() => setChangingAccess(row)} label={row.is_banned ? 'مسدود' : 'فعال'} ariaLabel={`دسترسی ${customerName(row)}`} /> },
    { key: 'created_at', title: 'تاریخ عضویت', render: value => <span className="finance-muted">{formatDate(value as string)}</span> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<MessageSquareText size={14} />} onClick={() => navigate(`/users/${row.id}/tickets`)}>تیکت‌ها</Button><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => begin(row)} aria-label={`ویرایش ${customerName(row)}`} /><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => setDeleting(row)} aria-label={`حذف ${customerName(row)}`} /></div> },
  ];
  return <div className="customers-page">
    <CatalogHeader title="کاربران" icon={UsersRound} total={total} loading={loading} actions={null} />
    <CatalogTable columns={columns} data={rows} loading={loading} error={error} onRefresh={() => void load()} keyExtractor={row => row.id}
      searchText={row => [customerName(row), row.username, row.phone_number].filter(Boolean).join(' ')}
      filter={{ label: 'همه دسترسی‌ها', options: [{ value: 'active', label: 'فعال' }, { value: 'banned', label: 'مسدود' }], value: row => row.is_banned ? 'banned' : 'active' }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="هنوز کاربری ثبت نشده است" />
    {!photoUser && <UserProfileModal user={editing} loading={profileLoading} error={profileError} open={Boolean(editing) || profileLoading || profileError} saving={saving} form={form} onChange={setForm} onClose={() => { if (!saving) closeProfile(); }} onSubmit={submit} onRetry={() => setProfileRevision(value => value + 1)} onPhotos={() => { if (editing) setPhotoUser(editing); }} />}
    {photoUser && <UserPhotoGallery key={photoUser.id} user={photoUser} onClose={() => setPhotoUser(null)} onSynced={() => { void usersApi.get(photoUser.id).then(user => { setRows(items => items.map(item => item.id === user.id ? user : item)); setEditing(previous => previous?.id === user.id ? user : previous); }).catch(() => {}); }} />}
    <ConfirmationModal isOpen={Boolean(changingAccess)} onClose={() => { if (!saving) setChangingAccess(null); }} onConfirm={changeAccess} title={changingAccess?.is_banned ? 'فعال‌سازی حساب' : 'مسدود کردن حساب'} message={`دسترسی «${changingAccess ? customerName(changingAccess) : ''}» ${changingAccess?.is_banned ? 'فعال' : 'مسدود'} شود؟`} confirmText={changingAccess?.is_banned ? 'فعال‌سازی' : 'مسدود کردن'} loading={saving} />
    <ConfirmationModal isOpen={Boolean(deleting)} onClose={() => { if (!saving) setDeleting(null); }} onConfirm={remove} title="حذف کاربر" message={`حساب «${deleting ? customerName(deleting) : ''}» و داده‌های وابسته حذف شود؟`} confirmText="حذف کاربر" loading={saving} />
  </div>;
}
