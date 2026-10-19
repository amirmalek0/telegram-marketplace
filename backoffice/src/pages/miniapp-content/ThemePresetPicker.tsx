import { useState } from 'react';
import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Palette, PaletteMode } from './palette';
import { matchingPreset, themeAccents, themeCollections, themePresets } from './themePresets';
import './theme-presets.css';

interface Props { palette: Palette; mode: PaletteMode; onSelect: (palette: Palette) => void }

export function ThemePresetPicker({ palette, mode, onSelect }: Props) {
  const [collection, setCollection] = useState('all');
  const [accent, setAccent] = useState('all');
  const selected = matchingPreset(palette);
  const visible = themePresets.filter(preset => (collection === 'all' || preset.collection === collection)
    && (accent === 'all' || preset.accent === accent));

  return <div className="theme-presets">
    <div className="theme-presets-heading"><h3>تم‌های آماده</h3><span>{themePresets.length.toLocaleString('fa-IR')} ترکیب</span></div>
    <p>هر تم شامل رنگ‌های روشن و تیره است. انتخاب تم فقط پیش‌نمایش را تغییر می‌دهد؛ برای اعمال عمومی، «ذخیره رنگ‌ها» را بزنید.</p>
    <div className="theme-color-filters">
      <div className="theme-color-filter-heading"><span>نمایش ترکیب‌ها بر اساس رنگ</span><button type="button" disabled={collection === 'all' && accent === 'all'} onClick={() => { setCollection('all'); setAccent('all'); }}>نمایش همه</button></div>
      <div className="theme-color-filter" role="group" aria-label="فیلتر رنگ زمینه">
        <span className="theme-color-filter-label">زمینه</span>
        <div className="theme-color-grid">
          <button type="button" className="theme-color-all" aria-pressed={collection === 'all'} onClick={() => setCollection('all')}>همه</button>
          {themeCollections.map(item => <button type="button" key={item.id} className="theme-color-swatch" aria-pressed={collection === item.id} aria-label={`زمینه ${item[mode].background} و سطح ${item[mode].surface}`} title={`${item[mode].background} / ${item[mode].surface}`} onClick={() => setCollection(item.id)}>
            <i style={{ background: `linear-gradient(135deg, ${item[mode].background} 50%, ${item[mode].surface} 50%)` }} />
            {collection === item.id && <Check size={13} aria-hidden="true" />}
          </button>)}
        </div>
      </div>
      <div className="theme-color-filter" role="group" aria-label="فیلتر رنگ اصلی">
        <span className="theme-color-filter-label">رنگ اصلی</span>
        <div className="theme-color-grid">
          <button type="button" className="theme-color-all" aria-pressed={accent === 'all'} onClick={() => setAccent('all')}>همه</button>
          {themeAccents.map(item => <button type="button" key={item.id} className="theme-color-swatch" aria-pressed={accent === item.id} aria-label={`رنگ اصلی ${item[mode]}`} title={item[mode]} onClick={() => setAccent(item.id)}>
            <i style={{ background: item[mode] }} />
            {accent === item.id && <Check size={13} aria-hidden="true" />}
          </button>)}
        </div>
      </div>
    </div>
    <div className="theme-presets-selection" role="status"><span className="theme-current-selection">{selected ? 'ترکیب انتخاب‌شده' : 'رنگ‌های فعلی'}<span className="theme-palette-swatches" aria-label="رنگ‌های انتخاب‌شده">{(['accent', 'background', 'surface', 'navigation'] as const).map(key => <i key={key} style={{ background: palette[mode][key] }} />)}</span></span><span>{visible.length.toLocaleString('fa-IR')} از {themePresets.length.toLocaleString('fa-IR')} ترکیب</span></div>
    <div className="theme-presets-grid" role="group" aria-label={`تم‌های آماده — ${mode === 'light' ? 'روشن' : 'تیره'}`}>
      {visible.map(preset => {
        const colors = preset.palette[mode];
        const active = selected?.id === preset.id;
        return <button type="button" className="theme-preset" key={preset.id} aria-pressed={active} aria-label={`انتخاب ترکیب ${themePresets.indexOf(preset) + 1}؛ رنگ ${colors.accent}، زمینه ${colors.background}`} onClick={() => onSelect(structuredClone(preset.palette))}>
          <span className="theme-preset-art" aria-hidden="true" style={{ '--preset-bg': colors.background, '--preset-surface': colors.surface, '--preset-text': colors.text, '--preset-secondary': colors.secondary, '--preset-accent': colors.accent, '--preset-nav': colors.navigation } as CSSProperties}>
            <span className="theme-preset-top"><i /><b /></span>
            <span className="theme-preset-card"><i /><span><b /><small /></span></span>
            <span className="theme-preset-nav"><i /><i /><i /></span>
          </span>
          <span className="theme-preset-label" aria-hidden="true"><span className="theme-palette-swatches">{(['accent', 'background', 'surface', 'navigation'] as const).map(key => <i key={key} style={{ background: colors[key] }} />)}</span>{active && <Check size={14} />}</span>
        </button>;
      })}
    </div>
  </div>;
}
