import { useEffect, useId, useState } from 'react';
import { FileText, LoaderCircle, Search } from 'lucide-react';
import { filesApi } from '@/api';
import type { FileResponse } from '@/types/files';
import { Button } from '@/components/ui';

interface Props { value: string[]; onChange: (ids: string[]) => void; error?: string }

export function ProductFilePicker({ value, onChange, error }: Props) {
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const errorId = useId();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    const load = async () => {
      try {
        const result: FileResponse[] = [];
        let page = 1;
        while (!controller.signal.aborted) {
          const response = await filesApi.list({ page, per_page: 100 }, controller.signal);
          result.push(...response.data);
          if (page >= response.total_pages || response.data.length === 0) break;
          page++;
        }
        if (!controller.signal.aborted) setFiles(result);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [revision]);

  const filtered = files.filter((file) => file.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);

  return <fieldset className="min-w-0 rounded-2xl border border-[rgb(var(--color-border))] p-4" aria-describedby={error ? errorId : undefined}>
    <legend className="px-2 text-sm font-bold">فایل‌های قابل دریافت</legend>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[rgb(var(--color-text-secondary))]">
      <p>تمام فایل‌های انتخاب‌شده پس از خرید در اختیار کاربر قرار می‌گیرند.</p>
      <span className="rounded-lg bg-blue-500/10 px-2 py-1 font-semibold text-blue-600">{value.length.toLocaleString('fa-IR')} فایل انتخاب‌شده</span>
    </div>
    <label className="mb-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] px-3 py-2">
      <Search size={16} className="shrink-0 text-[rgb(var(--color-text-muted))]" />
      <input aria-label="جست‌وجوی فایل‌ها" placeholder="جست‌وجوی نام فایل…" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
    </label>
    {loading ? <p className="flex items-center gap-2 py-4 text-xs"><LoaderCircle size={16} className="animate-spin"/>در حال دریافت فایل‌ها…</p> : failed ?
      <div className="flex items-center justify-between gap-3 py-3 text-xs"><span role="alert">دریافت فایل‌ها ناموفق بود</span><Button size="sm" variant="secondary" onClick={() => setRevision((number) => number + 1)}>تلاش دوباره</Button></div> :
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {filtered.map((file) => {
          const selected = value.includes(file.id);
          return <label key={file.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected ? 'border-blue-500/30 bg-blue-500/5' : 'border-transparent hover:bg-[rgb(var(--color-surface-2))]'}`}>
            <input type="checkbox" checked={selected} disabled={!selected && value.length >= 100} onChange={() => toggle(file.id)} className="h-4 w-4 shrink-0 accent-blue-600" />
            <FileText size={18} className="shrink-0 text-[rgb(var(--color-text-muted))]"/>
            <span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{file.name}</span><small className="mt-1 block text-[rgb(var(--color-text-muted))]">{(file.size / 1024).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} KB</small></span>
            {selected && <span className="text-xs font-semibold text-blue-600" aria-label="ترتیب تحویل">{(value.indexOf(file.id) + 1).toLocaleString('fa-IR')}</span>}
          </label>;
        })}
        {filtered.length === 0 && <p className="py-5 text-center text-xs text-[rgb(var(--color-text-muted))]">{files.length ? 'فایلی با این نام پیدا نشد.' : 'ابتدا فایل‌های محصول را در بخش فایل آپلود کنید.'}</p>}
      </div>}
    <p className="mt-3 text-xs text-[rgb(var(--color-text-muted))]">ترتیب انتخاب، ترتیب تحویل فایل‌هاست. حداکثر ۱۰۰ فایل.</p>
    {error && <p id={errorId} role="alert" className="mt-2 text-xs text-rose-500">{error}</p>}
  </fieldset>;
}
