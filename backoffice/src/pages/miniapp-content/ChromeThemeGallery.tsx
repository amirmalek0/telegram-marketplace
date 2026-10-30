import { useState } from 'react';
import { Bell, Check, Search, Sun } from 'lucide-react';
import { headerLayoutPresets, navigationLayoutPresets } from './chromeLayoutPresets';
import { ChromeLayoutPreview } from './ChromeLayoutPreview';
import { orderLayoutThemes } from './chromeThemeOrder';
import './chrome-theme-gallery.css';

const groups = [
  { id: 'all', label: 'همه', themes: [] },
  { id: 'simple', label: 'ساده', themes: ['classic','minimal','solid','compact','underline','editorial','notebook'] },
  { id: 'glass', label: 'شیشه و نور', themes: ['glass','gradient','aurora','frost','mesh','halo','neon'] },
  { id: 'color', label: 'رنگی', themes: ['soft','duotone','tinted','contrast'] },
  { id: 'shape', label: 'قاب و حجم', themes: ['outline','pill','elevated','split','segmented','floating','dock','rail','frame','capsule','island','bevel','inset','brutalist','dashed'] },
];

export function ChromeThemeGallery<T extends string>({ kind, themes, labels, value, onChange }: {
  kind: 'header' | 'navigation'; themes: readonly T[]; labels: Record<string,string>; value: T; onChange: (value:T) => void;
}) {
  const [filter, setFilter] = useState('all');
  const presets = kind === 'header' ? headerLayoutPresets : navigationLayoutPresets;
  const visible = orderLayoutThemes(themes, presets).filter(theme => filter === 'all'
    || (filter.startsWith('style:') && groups.find(item => item.id === filter.slice(6))?.themes.includes(theme)));
  return <div className="chrome-theme-gallery">
    <div className="chrome-gallery-summary"><strong>{themes.length.toLocaleString('fa-IR')} طرح آماده</strong><span>انتخاب‌شده: {labels[value]}</span></div>
    <label className="chrome-family-filter"><span>فیلتر طرح‌ها</span><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">همه طرح‌ها</option>{groups.filter(item => item.id !== 'all').map(item => <option key={item.id} value={`style:${item.id}`}>{item.label}</option>)}</select></label>
    <div className={`${kind === 'header' ? 'header-theme-grid' : 'navigation-theme-grid'} structural-theme-grid`} role="group" aria-label={kind === 'header' ? 'طرح سربرگ' : 'طرح نوار پایین'}>
      {visible.map(theme => <button type="button" key={theme} aria-pressed={value === theme} onClick={() => onChange(theme)}>
        {presets[theme] ? <ChromeLayoutPreview kind={kind} preset={presets[theme]}/> : <span className={`chrome-style-preview preview-${kind}`}>{kind === 'header' ? <span aria-hidden="true" className={`header-theme-sample header-sample-${theme}`}><i/><b/><span><Sun size={10}/><Bell size={10}/><Search size={10}/></span></span> : <span aria-hidden="true" className={`navigation-theme-sample theme-${theme}`}><i/><i/><i/><i/></span>}</span>}
        <strong>{labels[theme]}{value === theme && <Check size={13} aria-hidden="true"/>}</strong>
        {presets[theme] && <small className="chrome-layout-description">{presets[theme].description}</small>}
      </button>)}
    </div>
    <p className="chrome-gallery-note">طرح را انتخاب کنید تا در پیش‌نمایش ببینید؛ آیکون‌ها و ترتیب حفظ می‌شوند. چیدمان و ترتیب گزینه‌ها مستقل از تم هستند.</p>
  </div>;
}
