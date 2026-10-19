import { useEffect, useState } from 'react';
import { Palette as PaletteIcon, RotateCcw, Save, Sun, Moon, Grid2X2, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { colorFields, contrast, defaultPalette, paletteKey, readPalette, type Palette, type PaletteMode } from './palette';
import { ThemePresetPicker } from './ThemePresetPicker';
import { themePresets } from './themePresets';

export function ColorPaletteEditor({ onPreview }: { onPreview: (palette: Palette | null, mode: PaletteMode) => void }) {
  const [draft, setDraft] = useState(defaultPalette);
  const [saved, setSaved] = useState(defaultPalette);
  const [mode, setMode] = useState<PaletteMode>('light');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<'presets' | 'custom'>('presets');
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

  return <section className="palette-editor" aria-label="پالت رنگ مینی‌اپ">
    <div className="palette-editor-heading">
      <PaletteIcon size={19} /><h2>ظاهر مینی‌اپ</h2>
      {loaded && <span className={`palette-state ${dirty ? 'is-dirty' : ''}`} role="status">{dirty ? 'ذخیره نشده' : 'ذخیره‌شده'}</span>}
    </div>
    {loadError ? <div role="alert" className="palette-load-state">دریافت رنگ‌ها ناموفق بود. صفحه را دوباره بارگذاری کنید.</div> : !loaded ? <p role="status" className="palette-load-state">در حال دریافت رنگ‌ها…</p> : <>
      <fieldset disabled={saving} className="palette-controls">
        <legend className="sr-only">رنگ‌های حالت روشن و تیره</legend>
        <div className="palette-mode"><span>حالت پیش‌نمایش</span><div>
          {(['light', 'dark'] as const).map(item => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setMode(item)}>{item === 'light' ? <Sun size={14} /> : <Moon size={14} />}{item === 'light' ? 'روشن' : 'تیره'}</button>)}
        </div></div>
        <div className="palette-tabs" role="group" aria-label="روش تنظیم رنگ">
          <button type="button" aria-pressed={panel === 'presets'} onClick={() => setPanel('presets')}><Grid2X2 size={14} /> تم‌های آماده</button>
          <button type="button" aria-pressed={panel === 'custom'} onClick={() => setPanel('custom')}><SlidersHorizontal size={14} /> رنگ‌های سفارشی</button>
        </div>
        <div className="palette-scroll">
          <div hidden={panel !== 'presets'}><ThemePresetPicker palette={draft} mode={mode} onSelect={setDraft} /></div>
          <div hidden={panel !== 'custom'}>
            <p className="palette-custom-note">رنگ‌های حالت {mode === 'light' ? 'روشن' : 'تیره'} را تنظیم کنید؛ نتیجه بلافاصله در پیش‌نمایش دیده می‌شود.</p>
            {colorFields.map(({ key, label }) => <label key={key} className="palette-color-row"><span>{label}</span><span><code dir="ltr">{colors[key].toUpperCase()}</code><input type="color" aria-label={`${label} — ${mode === 'light' ? 'روشن' : 'تیره'}`} value={colors[key]} onChange={event => setDraft(current => ({ ...current, [mode]: { ...current[mode], [key]: event.target.value } }))} /></span></label>)}
            {lowContrast && <p role="status" className="palette-warning">کنتراست برخی متن‌ها در حالت روشن یا تیره کم است. رنگ متن و پس‌زمینه را متمایزتر کنید.</p>}
            <button type="button" className="palette-reset" onClick={() => setDraft(defaultPalette)}><RotateCcw size={14} /> بازگشت به رنگ‌های پیش‌فرض</button>
          </div>
        </div>
      </fieldset>
      <footer className="palette-footer">
        <p>{dirty ? 'تغییرات فقط در پیش‌نمایش است؛ با ذخیره برای همه اعمال می‌شود.' : `${themePresets.length.toLocaleString('fa-IR')} تم روشن و تیره؛ انتخاب کنید، ببینید و سپس ذخیره کنید.`}</p>
        <div><Button size="sm" icon={<Save size={14} />} onClick={save} disabled={!dirty || saving}>{saving ? 'در حال ذخیره…' : 'ذخیره رنگ‌ها'}</Button><Button size="sm" variant="secondary" onClick={() => setDraft(saved)} disabled={!dirty || saving}>لغو تغییرات</Button></div>
      </footer>
    </>}
  </section>;
}
