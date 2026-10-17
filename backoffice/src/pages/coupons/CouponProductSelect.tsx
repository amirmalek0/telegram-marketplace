import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { productsApi } from '@/api/products';
import type { ProductResponse } from '@/types';

export function CouponProductSelect({ value, onChange, disabled }: { value: string[]; onChange: (ids: string[]) => void; disabled: boolean }) {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(false);
    void (async () => {
      const items: ProductResponse[] = [];
      for (let page = 1; ; page++) {
        const result = await productsApi.list({ page, per_page: 100 }, abort.signal);
        items.push(...result.data);
        if (page >= result.total_pages || result.data.length === 0) break;
      }
      if (!abort.signal.aborted) setProducts(items);
    })().catch(() => { if (!abort.signal.aborted) setError(true); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [revision]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  const toggle = (productId: string) => onChange(value.includes(productId) ? value.filter(id => id !== productId) : [...value, productId]);
  const filtered = products.filter(product => product.title.toLocaleLowerCase('fa').includes(search.trim().toLocaleLowerCase('fa')));
  return <div ref={root} className="relative sm:col-span-2" onKeyDown={event => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); root.current?.querySelector<HTMLButtonElement>('button')?.focus(); } }}>
    <label id={`${id}-label`} className="mb-1.5 block text-sm font-medium">محصولات مشمول تخفیف</label>
    <button type="button" disabled={disabled} aria-labelledby={`${id}-label`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-3 text-sm">
      <span className="min-w-0 text-start">{value.length ? `${value.length.toLocaleString('fa-IR')} محصول انتخاب شده` : 'همه محصولات'}</span><ChevronDown size={16} className="shrink-0" aria-hidden="true" />
    </button>
    {open && <div id={id} className="mt-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-2 shadow-lg">
      <div className="flex items-center gap-2 border-b border-[rgb(var(--color-border))] px-2 pb-2"><Search size={16} /><input autoFocus aria-label="جست‌وجوی محصول" placeholder="جست‌وجوی نام محصول…" value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" /></div>
      <button type="button" disabled={disabled} onClick={() => onChange([])} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-blue-600">همه محصولات (بدون محدودیت){!value.length && <Check size={16} />}</button>
      <div className="max-h-52 overflow-y-auto" role="group" aria-label="انتخاب محصولات">
        {loading ? <p role="status" className="p-3 text-xs">در حال دریافت محصولات…</p> : error ? <button type="button" className="p-3 text-sm text-rose-500" onClick={() => setRevision(value => value + 1)}>دریافت محصولات ناموفق بود؛ تلاش دوباره</button> : filtered.length ? filtered.map(product => <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-blue-500/5">
          <input type="checkbox" disabled={disabled} checked={value.includes(product.id)} onChange={() => toggle(product.id)} className="accent-blue-600" />
          <span className="min-w-0 text-sm">{product.title}{product.status !== 'active' && <small className="mr-2 text-[rgb(var(--color-text-secondary))]">غیرفعال</small>}</span>
        </label>) : <p className="p-3 text-xs text-[rgb(var(--color-text-secondary))]">محصولی پیدا نشد.</p>}
      </div>
    </div>}
    {value.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{value.map(productId => <span key={productId} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs text-blue-600"><span className="truncate">{products.find(product => product.id === productId)?.title || (loading ? 'در حال دریافت نام…' : error ? 'محصول انتخاب‌شده' : 'محصول حذف‌شده')}</span><button type="button" disabled={disabled} onClick={() => toggle(productId)} aria-label={`حذف ${products.find(product => product.id === productId)?.title || 'محصول'} از انتخاب`}><X size={13} /></button></span>)}</div>}
    <p className="mt-2 text-xs text-[rgb(var(--color-text-secondary))]">بدون انتخاب محصول، کد روی همه محصولات اعمال می‌شود.</p>
  </div>;
}
