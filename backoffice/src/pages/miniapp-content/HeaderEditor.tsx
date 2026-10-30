import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, LayoutTemplate, RotateCcw, Save, SlidersHorizontal, PanelsTopLeft } from 'lucide-react';
import { ChromeThemeGallery } from './ChromeThemeGallery';
import { PositioningPicker } from './PositioningPicker';
import { headerPositions, headerGeometries, geometryLabels, resolveChrome, separateChrome } from './chromePositioning';
import { headerLayoutPresets } from './chromeLayoutPresets';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { defaultHeader, headerKey, headerThemes, headerThemeLabels, headerActionLabels, parseHeaderSettings, headerIconKeys, headerIconLabels, defaultHeaderIcons, type HeaderIconKey, type HeaderSettings } from './headerSettings';
import { IconPicker, IconPreview } from './IconPicker';
import type { NavigationIcon } from './navigationSettings';
import './header-editor.css';
import { HeaderLogoEditor } from './HeaderLogoEditor';

export function HeaderEditor({ onPreview }: { onPreview: (settings: HeaderSettings) => void }) {
  const [draft, setDraft] = useState<HeaderSettings>(() => structuredClone(defaultHeader));
  const [saved, setSaved] = useState<HeaderSettings>(() => structuredClone(defaultHeader));
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'design' | 'layout' | 'tools'>('design');
  const appearance = resolveChrome('header', draft);
  const updateAppearance = (patch: Partial<HeaderSettings>) => setDraft(current => ({ ...separateChrome('header', current), ...patch }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    let active = true;
    setError(false);
    apiClient.get<{ data: Record<string,string> }>('/miniapp-content').then(({ data }) => {
      if (!active) return;
      const settings = parseHeaderSettings(data.data[headerKey]) ?? structuredClone(defaultHeader);
      setDraft(settings); setSaved(structuredClone(settings)); setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { if (loaded) onPreview(draft); }, [draft, loaded, onPreview]);
  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);
  const save = async () => {
    if (!loaded || !dirty || saving || uploading) return;
    setSaving(true);
    try {
      await apiClient.put('/miniapp-content/' + headerKey, { value: JSON.stringify(draft) });
      setSaved(structuredClone(draft)); toast.success('تنظیمات سربرگ ذخیره شد');
    } catch { toast.error('ذخیره سربرگ ناموفق بود؛ دوباره تلاش کنید'); }
    finally { setSaving(false); }
  };
  const move = (index: number, offset: number) => {
    const order = [...draft.actionOrder];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    setDraft({ ...draft, actionOrder: order });
  };
  const setIcon = (key:HeaderIconKey, icon?:NavigationIcon) => setDraft(current => {
    const iconNames = {...current.iconNames};
    if (icon) iconNames[key] = icon; else delete iconNames[key];
    const next = {...current};
    if (Object.keys(iconNames).length) next.iconNames = iconNames; else delete next.iconNames;
    return next;
  });
  return <section className="palette-editor" aria-label="تنظیمات سربرگ">
    <div className="palette-editor-heading"><LayoutTemplate size={19} /><h2>سربرگ مینی‌اپ</h2>{loaded && <span className={`palette-state ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'ذخیره نشده' : 'ذخیره‌شده'}</span>}</div>
    <div className="editor-segmented header-editor-tabs" role="group" aria-label="بخش‌های سربرگ">
      <button type="button" aria-pressed={tab === 'design'} onClick={() => setTab('design')}><PanelsTopLeft size={15} /> طرح ظاهری</button>
      <button type="button" aria-pressed={tab === 'layout'} onClick={() => setTab('layout')}><LayoutTemplate size={15} /> چیدمان</button>
      <button type="button" aria-pressed={tab === 'tools'} onClick={() => setTab('tools')}><SlidersHorizontal size={15} /> ابزارها</button>
    </div>
    <div className="palette-scroll">
      {error ? <p role="alert">دریافت تنظیمات ناموفق بود. <button onClick={() => setAttempt(value => value + 1)}>تلاش دوباره</button></p> : !loaded ? <p role="status">در حال دریافت تنظیمات…</p> : <fieldset className="header-editor-fields" disabled={saving || uploading}>
        <div className="header-current-design"><span>سربرگ سراسری</span><strong>{headerThemeLabels[appearance.theme]}<i />{headerPositions.find(item => item.id === appearance.positioning)?.label}</strong></div>
        <div hidden={tab !== 'design'}>
        <h3>یک سبک برای سربرگ انتخاب کنید</h3>
        <p className="palette-custom-note">رنگ هر طرح از پالت فروشگاه شما گرفته می‌شود.</p>
        <ChromeThemeGallery kind="header" themes={headerThemes.filter(theme => !headerLayoutPresets[theme])} labels={headerThemeLabels} value={appearance.theme} onChange={theme => updateAppearance({ theme: theme as HeaderSettings['theme'] })}/>
        <label className="header-setting-row"><span>شکل دکمه‌ها</span><select value={appearance.geometry} onChange={event => updateAppearance({geometry:event.target.value as HeaderSettings['geometry']})}>{headerGeometries.map(id=><option key={id} value={id}>{geometryLabels[id]}</option>)}</select></label>
        </div>
        <div hidden={tab !== 'layout'}>
        <h3>چیدمان عنوان و ابزارها</h3>
        <p className="palette-custom-note">فقط جای عنوان و ابزارها تغییر می‌کند؛ تم ظاهری و ترتیب آیکون‌ها حفظ می‌شوند.</p>
        <PositioningPicker kind="header" value={appearance.positioning} onChange={positioning => updateAppearance({positioning})}/>
        <label className="header-setting-row"><span>ثابت ماندن هنگام اسکرول<small>سربرگ هنگام حرکت در صفحه در دسترس می‌ماند.</small></span><input type="checkbox" role="switch" checked={draft.sticky} onChange={event => setDraft({ ...draft, sticky: event.target.checked })} /></label>
        </div>
        <div hidden={tab !== 'tools'}>
        <HeaderLogoEditor logo={draft.logo} fallbackIcon={draft.iconNames?.title} disabled={saving} uploading={uploading} onUploading={setUploading} onChange={logo => setDraft(current => ({ ...current, logo, icons: { ...current.icons, title: logo ? true : current.icons.title } }))} />
        <h3>نمایش و ترتیب آیکون‌ها</h3>
        <p className="palette-custom-note">ترتیب ردیف‌ها، ترتیب دکمه‌ها از راست به چپ در مینی‌اپ است.</p>
        {draft.actionOrder.map((key, index) => { const iconKey = key === 'theme' ? 'themeLight' : key; return <div className="header-setting-row header-tool-row" key={key}><span className="header-tool-icon"><IconPreview name={draft.iconNames?.[iconKey] ?? defaultHeaderIcons[iconKey]} size={18} /></span><label><span>{headerActionLabels[key]}</span><input type="checkbox" role="switch" checked={draft.icons[key]} onChange={event => setDraft({ ...draft, icons: { ...draft.icons, [key]: event.target.checked } })} /></label><div><button type="button" disabled={index === 0 || saving} aria-label={`انتقال ${headerActionLabels[key]} به ابتدا`} onClick={() => move(index, -1)}><ArrowUp size={15} /></button><button type="button" disabled={index === 2 || saving} aria-label={`انتقال ${headerActionLabels[key]} به انتها`} onClick={() => move(index, 1)}><ArrowDown size={15} /></button></div></div>; })}
        <label className="header-setting-row"><span>آیکون کنار عنوان</span><input type="checkbox" role="switch" checked={draft.icons.title} onChange={event => setDraft({ ...draft, icons: { ...draft.icons, title: event.target.checked } })} /></label>
        <label className="header-setting-row"><span>جست‌وجو در سربرگ</span><select aria-label="محدوده جست‌وجوی سربرگ" disabled={!draft.icons.search || saving} value={draft.searchScope} onChange={event => setDraft({ ...draft, searchScope: event.target.value as HeaderSettings['searchScope'] })}><option value="shop">فقط فروشگاه</option><option value="all">همه صفحه‌های اصلی</option></select></label>
        <p className="header-tools-note">دکمه بازگشت در جزئیات همیشه باقی می‌ماند. ویجت جست‌وجوی صفحه، مستقل از این ابزارهاست.</p>
        <section className="header-icon-customization" aria-label="آیکون‌های سفارشی سربرگ"><h3>شکل آیکون‌ها</h3><p className="palette-custom-note">هر آیکون را جدا انتخاب کنید. بازنشانی، آیکون اصلی را برمی‌گرداند. لوگوی بارگذاری‌شده بر آیکون عنوان اولویت دارد.</p><div className="widget-fields-grid">{headerIconKeys.map(key=><IconPicker key={key} label={headerIconLabels[key]} fieldTitle={headerIconLabels[key]} value={draft.iconNames?.[key] ?? defaultHeaderIcons[key]} disabled={saving || uploading} onChange={icon=>setIcon(key,icon)} onReset={draft.iconNames?.[key] ? ()=>setIcon(key) : undefined}/>)}</div></section>
        </div>
        <button type="button" className="palette-reset" onClick={() => setDraft(structuredClone(defaultHeader))}><RotateCcw size={14} /> سربرگ پیش‌فرض</button>
      </fieldset>}
    </div>
    <footer className="palette-footer"><p>تغییرات زنده در پیش‌نمایش دیده می‌شوند؛ فقط با ذخیره برای کاربران منتشر می‌شوند.</p><div><Button size="sm" icon={<Save size={14} />} disabled={!loaded || !dirty || saving || uploading} onClick={save}>{saving ? 'در حال ذخیره…' : 'ذخیره سربرگ'}</Button><Button size="sm" variant="secondary" disabled={!dirty || saving || uploading} onClick={() => setDraft(structuredClone(saved))}>لغو تغییرات سربرگ</Button></div></footer>
  </section>;
}
