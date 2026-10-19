import { ArrowDown, ArrowUp, GripVertical, LockKeyhole, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { designLabels, sectionDefinition, type PageSection } from './pageLayouts';

export function PageLayoutRow({ item, index, total, disabled, onChange, onMove, onRemove }: {
  item: PageSection; index: number; total: number; disabled: boolean;
  onChange: (item: PageSection) => void; onMove: (from: number, to: number) => void; onRemove: () => void;
}) {
  const definition = sectionDefinition(item.type)!;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.type, disabled });
  return <li ref={setNodeRef} className={`layout-section-row ${item.visible ? '' : 'is-hidden'} ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <div className="layout-section-top">
      <button type="button" className="shop-arrangement-handle" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={disabled} aria-label={`جابه‌جایی ${definition.title}`}><GripVertical size={18} /></button>
      <div className="layout-section-title"><strong>{definition.title}</strong><small>{definition.required ? 'بخش ضروری؛ همیشه فعال' : item.visible ? 'نمایش در صفحه' : 'پنهان از صفحه'}{definition.page && !definition.required ? ' · ویژه این صفحه' : ''}</small></div>
      {definition.required ? <LockKeyhole size={16} className="layout-section-lock" aria-label="بخش ضروری" /> : <button type="button" className="shop-section-toggle" role="switch" aria-label={`نمایش ${definition.title}`} aria-checked={item.visible} disabled={disabled} onClick={() => onChange({ ...item, visible: !item.visible })}><span /></button>}
      <div className="shop-arrangement-arrows">
        <button type="button" disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} aria-label={`انتقال ${definition.title} به بالا`}><ArrowUp size={15} /></button>
        <button type="button" disabled={disabled || index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={`انتقال ${definition.title} به پایین`}><ArrowDown size={15} /></button>
      </div>
      <button type="button" className="layout-section-remove" disabled={disabled || definition.required} onClick={onRemove} aria-label={`حذف ${definition.title} از صفحه`}><Trash2 size={15} /></button>
    </div>
    {definition.designs.length > 1 && <div className="layout-section-designs" role="group" aria-label={`طرح ${definition.title}`}>
      {definition.designs.map(design => <button type="button" key={design} className={`layout-design-choice layout-design-${design}`} disabled={disabled} aria-pressed={item.design === design} onClick={() => onChange({ ...item, design })}>
        <span aria-hidden="true" className="layout-design-sample"><i /><i /><i /></span><span>{designLabels[design]}</span>
      </button>)}
    </div>}
  </li>;
}
