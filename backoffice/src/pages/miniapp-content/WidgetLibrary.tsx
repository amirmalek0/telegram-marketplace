import { useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { widgetLibrary, type PageId, type PageSection } from './pageLayouts';
import { isTextWidgetType } from './textWidgets';
import { imageWidgetType } from './imageWidgets';
import { defaultGlobalWidgetIcon, type GlobalWidgets } from './globalWidgets';
import { IconPreview } from './IconPicker';
import { widgetIcons } from './widgetIcons';

const groups = { all: 'همه', global: 'سراسری‌های من', custom: 'متن، تصویر و جست‌وجو', catalog: 'فروشگاه', account: 'حساب و خرید', support: 'پشتیبانی', page: 'ویژه این صفحه' } as const;
type Group = keyof typeof groups;
const normalize = (value: string) => value.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, '').trim();

export function WidgetLibrary({ page, sections, disabled, onAdd, onClose, reusableOnly = false, globals = {}, onAddGlobal, onEditGlobal, onDeleteGlobal }: {
  reusableOnly?: boolean; globals?: GlobalWidgets; onAddGlobal?: (id: string) => void; onEditGlobal?: (id: string) => void; onDeleteGlobal?: (id: string) => void;
  page: PageId; sections: PageSection[]; disabled: boolean; onAdd: (type: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const available = widgetLibrary.filter(item => {
    if (item.type === 'global.widget' || (reusableOnly && item.page)) return false;
    if (item.page && item.page !== page) return false;
    if (!normalize(item.title).includes(normalize(query))) return false;
    if (group === 'all') return true;
    if (group === 'page') return item.page === page;
    if (group === 'account') return ['account', 'orders', 'downloads'].includes(item.source);
    if (group === 'support') return ['tickets', 'notifications'].includes(item.source);
    return item.source === group;
  });
  const visibleGlobals = !reusableOnly && (group === 'all' || group === 'global') ? Object.entries(globals).filter(([, widget]) => normalize(widget.name).includes(normalize(query))) : [];
  return <section className="layout-library" aria-label="کتابخانه ویجت‌ها">
    <div className="widget-library-heading"><strong>یک ویجت اضافه کنید</strong><button type="button" aria-label="بستن کتابخانه ویجت‌ها" onClick={onClose}><X size={17} /></button></div>
    <label className="layout-library-search"><Search size={16} /><input autoFocus value={query} placeholder="جست‌وجوی عنوان، پاراگراف، محصولات…" aria-label="جست‌وجوی ویجت" onChange={event => setQuery(event.target.value)} /></label>
    <div className="editor-segmented widget-library-groups" role="group" aria-label="گروه ویجت‌ها">{Object.entries(groups).map(([key, label]) => <button type="button" key={key} aria-pressed={group === key} onClick={() => setGroup(key as Group)}>{label}</button>)}</div>
    <div className="layout-library-grid">
      {visibleGlobals.map(([id, widget]) => <div className="widget-library-card" key={id}>
        <button className="widget-library-add" type="button" disabled={disabled || sections.length >= 24} onClick={() => onAddGlobal?.(id)} aria-label={`افزودن ${widget.name}`}>
          <span className="widget-library-icon"><IconPreview name={widget.icon ?? defaultGlobalWidgetIcon} size={19} /></span><span className="widget-library-copy"><strong>{widget.name}</strong><small>سراسری · {widget.sections.length.toLocaleString('fa-IR')} جزء</small></span><Plus size={15} />
        </button>
        <div className="widget-library-actions">
          <button type="button" disabled={disabled} onClick={() => onEditGlobal?.(id)} aria-label={`ویرایش ${widget.name}`} title="ویرایش ویجت"><Pencil size={14} /></button>
          <button type="button" disabled={disabled} onClick={() => onDeleteGlobal?.(id)} aria-label={`حذف ${widget.name} از کتابخانه`} title="حذف از کتابخانه"><Trash2 size={14} /></button>
        </div>
      </div>)}
      {available.map(item => {
      const custom = isTextWidgetType(item.type) || item.type === imageWidgetType;
      const exists = !custom && sections.some(section => section.type === item.type);
      return <button className="widget-library-add" type="button" key={item.type} disabled={disabled || exists || sections.length >= 24} onClick={() => onAdd(item.type)}>
        <span className="widget-library-icon"><IconPreview name={widgetIcons[item.type]} size={19} /></span><span className="widget-library-copy"><strong>{item.title}</strong><small>{exists ? 'اضافه شده' : custom ? 'محتوا و استایل مستقل' : item.page ? 'ویژه این صفحه' : 'ویجت آماده'}</small></span>{exists ? <Check size={15} /> : <Plus size={15} />}
      </button>;
    })}</div>
    {!available.length && !visibleGlobals.length && <p className="widget-library-empty">ویجتی پیدا نشد؛ برای ساخت ویجت سراسری، موارد دلخواه را در صفحه انتخاب کنید.</p>}
    {sections.length >= 24 && <p className="palette-warning">حداکثر ۲۴ ویجت در هر صفحه مجاز است.</p>}
  </section>;
}
