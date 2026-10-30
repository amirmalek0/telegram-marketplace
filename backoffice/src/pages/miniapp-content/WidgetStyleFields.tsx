import { useState, type ReactNode } from 'react';
import { AlignRight, Box, ChevronDown, Link2, Paintbrush, RotateCcw, Scan, Type, Unlink } from 'lucide-react';
import { numericStyleRules, enumStyleRules } from './textWidgets';
import { imageNumberRules, imageEnumRules } from './imageWidgets';
import { ColorField, NumberField } from './WidgetFields';
import { borderKeys, paddingKeys, radiusKeys, updateStyleGroup, type WidgetStyles } from './widgetStyleControls';

const labels: Record<string, string> = { height: 'ارتفاع (px)', mobileHeight: 'ارتفاع موبایل (px)', marginLeft: 'چپ', marginRight: 'راست', objectFit: 'نمایش تصویر', alignment: 'تراز تصویر', textAlign: 'تراز متن', direction: 'جهت متن', fontFamily: 'خانواده قلم', textDecoration: 'تزئین متن', borderStyle: 'نوع کادر', shadow: 'سایه' };
const optionLabels: Record<string, string> = { start: 'ابتدا', center: 'وسط', end: 'انتها', justify: 'دوطرفه', rtl: 'راست به چپ', ltr: 'چپ به راست', inherit: 'قلم مینی‌اپ', 'sans-serif': 'Sans-serif', serif: 'Serif', monospace: 'Monospace', none: 'بدون', soft: 'ملایم', lifted: 'برجسته', solid: 'پیوسته', dashed: 'خط‌چین', dotted: 'نقطه‌چین', double: 'دوخطی', underline: 'زیرخط', 'line-through': 'خط‌خورده', contain: 'کامل، بدون برش', cover: 'پر کردن با برش' };

function EdgeFields({ title, keys, styles, onChange, ranges }: { title: string; keys: string[]; styles: WidgetStyles; ranges: Record<string, readonly [number, number]>; onChange: (styles: WidgetStyles) => void }) {
  const [linked, setLinked] = useState(false);
  return <div className="widget-edge-group"><div className="widget-edge-heading"><h4>{title} <small>px</small></h4><button type="button" aria-pressed={linked} aria-label={`یکسان‌سازی ${title}`} title={linked ? 'مقادیر با هم تغییر می‌کنند' : 'تغییر هم‌زمان همه مقادیر'} onClick={() => setLinked(value => !value)}>{linked ? <Link2 size={14} /> : <Unlink size={14} />}{linked ? 'متصل' : 'جدا'}</button></div>
    <div className="widget-fields-grid widget-four-fields">{keys.map(key => <NumberField key={key} name={key} label={labels[key]} context={title} range={ranges[key]} value={styles[key]} onChange={value => onChange(updateStyleGroup(styles, linked ? keys : [key], value))} />)}</div>
  </div>;
}

function StyleSection({ title, icon, keys, styles, onChange, children, open = false }: { title: string; icon: ReactNode; keys: string[]; styles: WidgetStyles; onChange: (styles: WidgetStyles) => void; children: ReactNode; open?: boolean }) {
  const count = keys.filter(key => styles[key] !== undefined).length;
  return <details className="widget-style-section" open={open || undefined}><summary>{icon}<span>{title}</span>{!!count && <small>{count.toLocaleString('fa-IR')} سفارشی</small>}<ChevronDown size={15} className="widget-section-chevron" /></summary><div className="widget-style-section-body">{children}{!!count && <button type="button" className="widget-section-reset" onClick={() => onChange(updateStyleGroup(styles, keys))}><RotateCcw size={12} /> بازنشانی {title}</button>}</div></details>;
}

export function WidgetStyleFields({ styles, onChange, image = false }: { styles: WidgetStyles; onChange: (styles: WidgetStyles) => void; image?: boolean }) {
  const ranges = image ? imageNumberRules : numericStyleRules;
  const enums = image ? imageEnumRules : enumStyleRules;
  const number = (key: string) => <NumberField key={key} name={key} label={labels[key]} range={ranges[key]} value={styles[key]} onChange={value => onChange(updateStyleGroup(styles, [key], value))} />;
  const select = (key: string) => <label key={key} className="widget-field"><span>{labels[key]}</span><select value={styles[key] ?? ''} aria-label={labels[key]} onChange={event => onChange(updateStyleGroup(styles, [key], event.target.value || undefined))}><option value="">پیش‌فرض تم</option>{enums[key].map(option => <option key={option} value={option}>{optionLabels[option] ?? option}</option>)}</select></label>;
  const color = (key: string) => <ColorField key={key} name={key} value={styles[key]} onChange={value => onChange(updateStyleGroup(styles, [key], value))} />;
  const typography = ['fontSize', 'mobileFontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'direction', 'fontFamily', 'textDecoration'];
  const size = image ? ['width', 'maxWidth', 'height', 'mobileHeight', 'objectFit', 'alignment'] : ['width', 'maxWidth'];
  const margins = image ? ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'] : ['marginTop', 'marginBottom'];
  const colors = image ? ['backgroundColor'] : ['color', 'backgroundColor'];
  return <div className="widget-style-sections">
    {!image && <StyleSection title="تایپوگرافی" icon={<Type size={16} />} keys={typography} styles={styles} onChange={onChange} open><div className="widget-fields-grid">{typography.map(key => enums[key] ? select(key) : number(key))}</div></StyleSection>}
    <StyleSection title="اندازه و نمایش" icon={<Scan size={16} />} keys={size} styles={styles} onChange={onChange} open={image}><div className="widget-fields-grid">{size.map(key => enums[key] ? select(key) : number(key))}</div>{image && <p className="widget-help">ارتفاع خالی نسبت اصلی تصویر را حفظ می‌کند؛ اندازه موبایل فقط روی نمایشگر کوچک اعمال می‌شود.</p>}</StyleSection>
    <StyleSection title="رنگ و جلوه" icon={<Paintbrush size={16} />} keys={[...colors, 'shadow', 'opacity']} styles={styles} onChange={onChange}><div className="widget-fields-grid">{colors.map(color)}{select('shadow')}{number('opacity')}</div><p className="widget-help">رنگ خودکار با حالت روشن و تیره هماهنگ است. برای بی‌رنگ شدن، transparent وارد کنید.</p></StyleSection>
    <StyleSection title="فاصله‌ها" icon={<AlignRight size={16} />} keys={[...paddingKeys, ...margins]} styles={styles} onChange={onChange}><EdgeFields title="فاصله داخلی" keys={paddingKeys} styles={styles} ranges={ranges} onChange={onChange} /><EdgeFields title="فاصله بیرونی" keys={margins} styles={styles} ranges={ranges} onChange={onChange} /></StyleSection>
    <StyleSection title="کادر و گوشه‌ها" icon={<Box size={16} />} keys={['borderStyle', 'borderColor', ...borderKeys, ...radiusKeys]} styles={styles} onChange={onChange}><div className="widget-fields-grid">{select('borderStyle')}{color('borderColor')}</div><EdgeFields title="ضخامت کادر" keys={borderKeys} styles={styles} ranges={ranges} onChange={onChange} /><EdgeFields title="گردی گوشه‌ها" keys={radiusKeys} styles={styles} ranges={ranges} onChange={onChange} /><p className="widget-help">برای نمایش کادر، ضخامت ضلع‌ها را بیشتر از صفر قرار دهید.</p></StyleSection>
  </div>;
}
