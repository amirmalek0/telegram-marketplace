import { useEffect, useState } from 'react';
import { Palette as PaletteIcon, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { colorFields, contrast, defaultPalette, paletteKey, readPalette, type Palette, type PaletteMode } from './palette';

export function ColorPaletteEditor({ onPreview }: { onPreview: (palette: Palette | null, mode: PaletteMode) => void }) {
  const [draft, setDraft] = useState(defaultPalette);
  const [saved, setSaved] = useState(defaultPalette);
  const [mode, setMode] = useState<PaletteMode>('light');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const isDefault = JSON.stringify(draft) === JSON.stringify(defaultPalette);
  const colors = draft[mode];
  const lowContrast = (['light', 'dark'] as const).some((theme) => {
    const c = draft[theme];
    return [c.background, c.surface].some((bg) => contrast(c.text, bg) < 4.5 || contrast(c.secondary, bg) < 4.5);
  });

  useEffect(() => {
    let active = true;
    apiClient.get<{ data: Record<string, string> }>('/miniapp-content').then(({ data }) => {
      if (!active) return;
      const palette = readPalette(data.data[paletteKey]);
      setDraft(palette); setSaved(palette); setLoaded(true);
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loaded) onPreview(isDefault ? null : draft, mode);
  }, [draft, isDefault, loaded, mode, onPreview]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = async () => {
    if (saving || !loaded) return;
    setSaving(true);
    try {
      if (isDefault) await apiClient.delete(`/miniapp-content/${paletteKey}`);
      else await apiClient.put(`/miniapp-content/${paletteKey}`, { value: JSON.stringify(draft) });
      setSaved(draft);
      toast.success('رنگ‌های مینی‌اپ ذخیره شد');
    } catch { toast.error('ذخیره رنگ‌ها ناموفق بود؛ دوباره تلاش کنید'); }
    finally { setSaving(false); }
  };

  return <section className="surface-card space-y-4 p-4" aria-label="پالت رنگ مینی‌اپ">
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><PaletteIcon size={18} /></span>
      <h2 className="text-sm font-semibold">پالت رنگ</h2>
      {dirty && <span className="mr-auto text-[10px] text-amber-600 dark:text-amber-400">ذخیره نشده</span>}
    </div>
    <p className="text-xs leading-6 text-[rgb(var(--color-text-secondary))]">رنگ‌ها را در پیش‌نمایش ببینید. با ذخیره، ظاهر جدید برای همه کاربران اعمال می‌شود.</p>
    {loadError ? <p role="alert" className="text-xs text-red-500">دریافت رنگ‌ها ناموفق بود. صفحه را دوباره بارگذاری کنید.</p> : !loaded ? <p role="status" className="text-xs">در حال دریافت رنگ‌ها…</p> : <>
      <fieldset disabled={saving} className="space-y-4">
        <legend className="sr-only">رنگ‌های حالت روشن و تیره</legend>
        <div className="flex gap-1 rounded-xl bg-slate-500/10 p-1">
          {(['light', 'dark'] as const).map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)} className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${mode === item ? 'bg-violet-500 text-white shadow-sm' : 'text-[rgb(var(--color-text-secondary))]'}`}>{item === 'light' ? 'روشن' : 'تیره'}</button>)}
        </div>
        <div className="divide-y divide-[rgb(var(--color-border))]">
          {colorFields.map(({ key, label }) => <label key={key} className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-xs">
            <span>{label}</span>
            <span className="flex items-center gap-2"><span dir="ltr" className="font-mono text-[10px] text-[rgb(var(--color-text-secondary))]">{colors[key].toUpperCase()}</span><input type="color" aria-label={`${label} — ${mode === 'light' ? 'روشن' : 'تیره'}`} value={colors[key]} onChange={(event) => setDraft((current) => ({ ...current, [mode]: { ...current[mode], [key]: event.target.value } }))} className="h-9 w-10 cursor-pointer rounded-lg border border-[rgb(var(--color-border))] bg-transparent p-1" /></span>
          </label>)}
        </div>
        {lowContrast && <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-[11px] leading-6 text-amber-700 dark:text-amber-300">کنتراست بعضی متن‌ها در حالت روشن یا تیره کم است. برای خوانایی بهتر، رنگ متن و پس‌زمینه را از هم متمایز کنید.</p>}
        <button type="button" onClick={() => setDraft(defaultPalette)} className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]"><RotateCcw size={14} /> بازگشت به رنگ‌های پیش‌فرض</button>
      </fieldset>
      <div className="flex flex-wrap gap-2 border-t border-[rgb(var(--color-border))] pt-4">
        <Button size="sm" icon={<Save size={14} />} onClick={save} disabled={!dirty || saving}>{saving ? 'در حال ذخیره…' : 'ذخیره رنگ‌ها'}</Button>
        <Button size="sm" variant="secondary" onClick={() => setDraft(saved)} disabled={!dirty || saving}>لغو تغییرات</Button>
      </div>
    </>}
  </section>;
}
