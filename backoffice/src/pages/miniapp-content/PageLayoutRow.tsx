import { ArrowDown, ArrowUp, Copy, ChevronDown, GripVertical, LockKeyhole, Trash2, Globe2, Unlink } from 'lucide-react';
import { IconPreview } from './IconPicker';
import { widgetIcons } from './widgetIcons';
import type { NavigationIcon } from './navigationSettings';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { designLabels, sectionDefinition, sectionKey, type PageSection } from './pageLayouts';

import { searchDesignLabels } from './headerSettings';
import { textThemeLabels } from './textWidgets';
import { TextWidgetEditor } from './TextWidgetEditor';
import { ImageWidgetEditor } from './ImageWidgetEditor';
import { ProductFactsEditor } from './ProductFactsEditor';
import { WidgetAppearanceEditor } from './WidgetAppearanceEditor';

export function PageLayoutRow({ item, index, total, disabled, expanded, onEdit, onDuplicate, onChange, onMove, onRemove, onUploading, globalName, globalIcon, onGlobalEdit, onDetach, onSaveGlobal, selected, onSelect }: {
  globalName?: string; globalIcon?: NavigationIcon; onGlobalEdit?: () => void; onDetach?: () => void; onSaveGlobal?: () => void; selected?: boolean; onSelect?: () => void;
  onUploading: (busy: boolean) => void;
  expanded: boolean; onEdit: () => void; onDuplicate: () => void;
  item: PageSection; index: number; total: number; disabled: boolean;
  onChange: (item: PageSection) => void; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const definition = sectionDefinition(item.type)!;
  const global = item.type === 'global.widget';
  const designLabel = item.text || item.image ? textThemeLabels[item.design] : item.type === 'catalog.search' ? searchDesignLabels[item.design] : designLabels[item.design];
  const editable = true;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sectionKey(item), disabled });
  return <li id={'layout-' + sectionKey(item)} ref={setNodeRef} className={`layout-section-row ${expanded ? 'is-expanded' : ''} ${item.visible ? '' : 'is-hidden'} ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="layout-section-top">
      {onSelect && <input className="widget-group-select" type="checkbox" aria-label={`انتخاب ${globalName || definition.title} برای گروه`} checked={!!selected} disabled={disabled} onChange={onSelect} />}
      <button type="button" className="shop-arrangement-handle" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={disabled} aria-label={`جابه‌جایی ${definition.title}`}><GripVertical size={18} /></button>
      <span className="widget-row-icon"><IconPreview name={(global && globalIcon) || widgetIcons[item.type]} size={19} /></span>
      <button type="button" className="layout-section-title" disabled={!editable || disabled} aria-expanded={editable ? expanded : undefined} aria-controls={editable ? 'settings-' + sectionKey(item) : undefined} onClick={onEdit}><strong>{global ? globalName || 'ویجت سراسری ناموجود' : item.text ? item.text.tag.toUpperCase() + ' · ' + (item.text.content.slice(0, 28) || 'متن خالی') : definition.title}</strong><small>{global ? 'پیوند سراسری · تغییر مشترک در همه صفحه‌ها' : definition.required ? 'ضروری · همیشه فعال' : `${item.visible ? 'نمایان' : 'پنهان'} · ${designLabel}`}</small></button>
      {definition.required ? <LockKeyhole size={16} className="layout-section-lock" aria-label="بخش ضروری" /> : <button type="button" className="shop-section-toggle" role="switch" aria-label={`نمایش ${definition.title}`} aria-checked={item.visible} disabled={disabled} onClick={() => onChange({ ...item, visible: !item.visible })}><span /></button>}
      {editable && <button type="button" className="widget-expand" disabled={disabled} aria-label={`تنظیمات ${definition.title}`} aria-expanded={expanded} aria-controls={'settings-' + sectionKey(item)} onClick={onEdit}><ChevronDown size={17} /></button>}
    </div>
    {expanded && editable && <div className="widget-row-settings" id={'settings-' + sectionKey(item)}>
      <div className="widget-row-toolbar"><span>طراحی ویجت</span><div className="shop-arrangement-arrows">
        <button type="button" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label={`انتقال ${definition.title} به بالا`}><ArrowUp size={15} /></button>
        <button type="button" disabled={disabled || index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={`انتقال ${definition.title} به پایین`}><ArrowDown size={15} /></button>
      </div>
      {(item.text || item.image || global) && <button type="button" disabled={disabled || total >= 24} onClick={onDuplicate}><Copy size={14} /> تکثیر</button>}
      {onSaveGlobal && <button type="button" disabled={disabled} onClick={onSaveGlobal}><Globe2 size={14} /> ذخیره سراسری</button>}
      <button type="button" className="layout-section-remove" disabled={disabled || definition.required} onClick={onRemove} aria-label={`حذف ${definition.title} از صفحه`}><Trash2 size={15} /></button>
      </div>
    {definition.designs.length > 1 && <div className="layout-section-designs" role="group" aria-label={`طرح ${definition.title}`}>
      {definition.designs.map(design => <button type="button" key={design} className={`layout-design-choice layout-design-${design}`} disabled={disabled} aria-pressed={item.design === design} onClick={() => onChange({ ...item, design })}>
        <span aria-hidden="true" className="layout-design-sample"><i /><i /><i /></span><span>{item.text || item.image ? textThemeLabels[design] : (item.type === 'catalog.search' ? searchDesignLabels[design] : designLabels[design])}</span>
      </button>)}
    </div>}
    {global && <div className="global-widget-link"><p>ظاهر و محتوای این ویجت در کتابخانه مشترک است. نمایش و موقعیت آن فقط برای همین صفحه تنظیم می‌شود.</p><div><button type="button" disabled={disabled || !globalName} onClick={onGlobalEdit}><Globe2 size={15} /> ویرایش سراسری</button><button type="button" disabled={disabled || !globalName} onClick={onDetach}><Unlink size={15} /> تبدیل به نسخه مستقل</button></div></div>}
    {item.type === 'product.facts' && <ProductFactsEditor value={item.facts} icons={item.factIcons} disabled={disabled} onChange={facts => onChange({ ...item, facts })} onIconsChange={factIcons => onChange({ ...item, factIcons })} />}
    {item.text && <TextWidgetEditor value={item.text} heading={item.type === 'text.heading'} disabled={disabled} onChange={text => onChange({ ...item, text })} />}
    {item.image && <ImageWidgetEditor value={item.image} disabled={disabled} onUploading={onUploading} onChange={image => onChange({ ...item, image })} />}
    {!item.text && !item.image && <WidgetAppearanceEditor value={item.appearance} disabled={disabled} onChange={appearance => { const next = { ...item }; if (appearance) next.appearance = appearance; else delete next.appearance; onChange(next); }} />}
    </div>}
  </li>;
}
