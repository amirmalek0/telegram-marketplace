import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, Users, X } from 'lucide-react';
import { usersApi } from '@/api';
import type { UserResponse } from '@/types';

interface Props {
  scope: 'all' | 'selected';
  value: string[];
  disabled: boolean;
  onScopeChange: (scope: 'all' | 'selected') => void;
  onChange: (ids: string[]) => void;
}

const name = (user: UserResponse) => [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || String(user.telegram_id);
const normalize = (text: string) => text.toLocaleLowerCase('fa').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export function CouponUserSelect({ scope, value, disabled, onScopeChange, onChange }: Props) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef<HTMLFieldSetElement>(null);
  const id = useId();
  useEffect(() => {
    if (scope !== 'selected') return;
    const abort = new AbortController();
    setLoading(true); setError(false);
    void (async () => {
      const result: UserResponse[] = [];
      for (let page = 1; ; page++) {
        const response = await usersApi.list({ page, per_page: 100 }, abort.signal);
        result.push(...response.data);
        if (page >= response.total_pages || !response.data.length) break;
      }
      if (!abort.signal.aborted) setUsers(result);
    })().catch(() => { if (!abort.signal.aborted) setError(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [scope, revision]);
  useEffect(() => {
    // Close after the target's click so collapsing the inline chooser does not
    // move the modal footer between pointerdown and pointerup (losing Save).
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('click', outside);
    return () => document.removeEventListener('click', outside);
  }, []);
  const toggle = (userId: string) => onChange(value.includes(userId) ? value.filter(id => id !== userId) : [...value, userId]);
  const filtered = users.filter(user => normalize(`${name(user)} ${user.username || ''} ${user.telegram_id}`).includes(normalize(search.trim().replace(/^@/, ''))));

  return <fieldset ref={root} disabled={disabled} className="min-w-0 space-y-3 border-t border-[rgb(var(--color-border))] pt-3 sm:col-span-2" onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); document.getElementById(`${id}-trigger`)?.focus(); }
  }}>
    <legend className="flex items-center gap-2 px-1 text-sm font-medium"><Users size={16} />کاربران مجاز</legend>
    <div className="flex flex-wrap gap-4 text-sm">
      <label className="flex items-center gap-2"><input type="radio" name={`${id}-scope`} checked={scope === 'all'} onChange={() => { onScopeChange('all'); setOpen(false); }} />همه کاربران</label>
      <label className="flex items-center gap-2"><input type="radio" name={`${id}-scope`} checked={scope === 'selected'} onChange={() => { onScopeChange('selected'); setOpen(true); }} />کاربران منتخب</label>
    </div>
    {scope === 'all' ? <p className="text-xs leading-6 text-[rgb(var(--color-text-muted))]">همه کاربران با رعایت سایر شرایط کد می‌توانند از آن استفاده کنند.</p> : <>
      <button id={`${id}-trigger`} type="button" aria-label="انتخاب کاربران مجاز" aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(v => !v)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-3 text-sm"><span className="min-w-0 text-start">{value.length ? `${value.length.toLocaleString('fa-IR')} کاربر انتخاب شده` : 'یک یا چند کاربر را انتخاب کنید'}</span><ChevronDown size={16} className="shrink-0" aria-hidden="true" /></button>
      {open && <div id={`${id}-options`} className="rounded-xl border border-[rgb(var(--color-border))] p-2">
        <div className="flex items-center gap-2 border-b border-[rgb(var(--color-border))] px-2 pb-2"><Search size={16} /><input autoFocus aria-label="جست‌وجوی کاربران" placeholder="نام، نام کاربری یا شناسه تلگرام…" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" /></div>
        <div className="max-h-52 overflow-y-auto" role="group" aria-label="انتخاب کاربران">
          {loading ? <p role="status" className="p-3 text-xs">در حال دریافت کاربران…</p> : error ? <button type="button" className="p-3 text-sm text-rose-500" onClick={() => setRevision(v => v + 1)}>دریافت کاربران ناموفق بود؛ تلاش دوباره</button> : filtered.length ? filtered.map(user => <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-blue-500/5">
            <input type="checkbox" checked={value.includes(user.id)} onChange={() => toggle(user.id)} className="accent-blue-600" />
            <span className="min-w-0"><span className="block break-words text-sm">{name(user)}{user.is_banned && <small className="mr-2 text-rose-500">مسدود</small>}</span><span className="block text-xs text-[rgb(var(--color-text-muted))]" dir="ltr">{user.username ? `@${user.username} · ` : ''}{user.telegram_id}</span></span>
          </label>) : <p className="p-3 text-xs text-[rgb(var(--color-text-muted))]">کاربری پیدا نشد.</p>}
        </div>
      </div>}
      {value.length > 0 && <div className="flex flex-wrap gap-2">{value.map(userId => {
        const user = users.find(item => item.id === userId);
        const title = user ? name(user) : loading ? 'در حال دریافت نام…' : error ? 'کاربر انتخاب‌شده' : 'کاربر حذف‌شده یا در دسترس نیست';
        return <span key={userId} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-blue-500/10 px-2 py-1.5 text-xs text-blue-600"><span className="truncate">{title}{user?.username && <bdi> (@{user.username})</bdi>}</span><button type="button" onClick={() => toggle(userId)} aria-label={`حذف ${title} از کاربران مجاز`}><X size={14} /></button></span>;
      })}</div>}
      {!value.length && <p role="alert" className="text-xs text-rose-500">حداقل یک کاربر انتخاب کنید یا گزینه همه کاربران را فعال کنید.</p>}
    </>}
  </fieldset>;
}
