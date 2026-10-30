import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ArrowRight, Globe2, Plus, Save, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { PageLayoutRow } from './PageLayoutRow';
import { WidgetLibrary } from './WidgetLibrary';
import { sectionDefinition, sectionKey, type PageSection } from './pageLayouts';
import { defaultGlobalWidgetIcon, parseGlobalWidget, type GlobalWidget } from './globalWidgets';
import { IconPicker } from './IconPicker';
import { isTextWidgetType, newTextWidget } from './textWidgets';
import { imageWidgetType, newImageWidget } from './imageWidgets';
import './global-widgets.css';

export function GlobalWidgetEditor({ value, isNew, usage, saving, conflict, onChange, onSave, onCancel, onDelete }: {
  value: GlobalWidget; isNew: boolean; usage: string[]; saving: boolean; conflict?: string;
  onChange: (widget: GlobalWidget) => void; onSave: () => Promise<void>; onCancel: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(value.sections[0] ? sectionKey(value.sections[0]) : null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmation, setConfirmation] = useState<'save' | 'cancel' | null>(null);
  const busy = saving || uploading;
  const valid = !!parseGlobalWidget(value) && !conflict;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const change = (sections: PageSection[]) => onChange({ ...value, sections });
  const move = (from: number, to: number) => change(arrayMove(value.sections, from, to));
  const add = (type: string) => {
    const item: PageSection = type === imageWidgetType ? newImageWidget() : isTextWidgetType(type) ? newTextWidget(type) : { type, visible: true, design: sectionDefinition(type)!.designs[0] };
    change([...value.sections, item]); setExpanded(sectionKey(item)); setLibraryOpen(false);
  };
  return <section className="palette-editor" aria-label="ویرایش ویجت سراسری">
    <div className="palette-editor-heading"><Globe2 size={19} /><h2>{isNew ? 'ساخت ویجت سراسری' : 'ویرایش ویجت سراسری'}</h2><button type="button" disabled={busy} onClick={() => setConfirmation('cancel')} aria-label="بازگشت به صفحه‌ها"><ArrowRight size={18} /></button></div>
    <div className="palette-scroll">
      <div className="global-edit-notice"><Globe2 size={18} /><div><strong>یک تعریف، در همه صفحه‌ها</strong><p>{usage.length ? 'استفاده در: ' + usage.join('، ') : 'هنوز در صفحه‌ای منتشر نشده است.'}</p><small>فقط با ذخیره سراسری، تغییرات برای کاربران منتشر می‌شوند. گروه‌ها به‌ترتیب عمودی نمایش داده می‌شوند. اگر ویجت در صفحه فعلی نباشد، پیش‌نمایش موقتاً روی آن متمرکز می‌شود؛ چیدمان صفحه تغییر نمی‌کند.</small></div></div>
      <label className="widget-field global-name"><span>نام ویجت در کتابخانه</span><input aria-label="نام ویجت سراسری" maxLength={80} disabled={busy} value={value.name} placeholder="مثلاً بنر معرفی فروشگاه" onChange={event => onChange({ ...value, name: event.target.value })} /></label>
      <div className="global-icon-field"><IconPicker label="انتخاب آیکون ویجت سراسری" fieldTitle="آیکون ویجت در کتابخانه" value={value.icon ?? defaultGlobalWidgetIcon} disabled={busy} onChange={icon => onChange({ ...value, icon })} onReset={() => { const next = { ...value }; delete next.icon; onChange(next); }} /></div>
      {!isNew && <button className="global-delete-button" type="button" disabled={busy} onClick={onDelete}><Trash2 size={15} /> حذف از کتابخانه سراسری</button>}
      <div className="layout-page-heading"><h3>اجزای ویجت · {value.sections.length.toLocaleString('fa-IR')}</h3><Button size="sm" disabled={busy} icon={<Plus size={15} />} onClick={() => setLibraryOpen(!libraryOpen)}>افزودن جزء</Button></div>
      {libraryOpen && <WidgetLibrary reusableOnly page="shop" sections={value.sections} disabled={busy} onAdd={add} onClose={() => setLibraryOpen(false)} />}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => { if (over && active.id !== over.id) move(value.sections.findIndex(item => sectionKey(item) === active.id), value.sections.findIndex(item => sectionKey(item) === over.id)); }}><SortableContext items={value.sections.map(sectionKey)} strategy={verticalListSortingStrategy}><ol className="layout-section-list">{value.sections.map((item, index) => <PageLayoutRow key={sectionKey(item)} item={item} index={index} total={value.sections.length} disabled={busy} expanded={expanded === sectionKey(item)} onEdit={() => setExpanded(expanded === sectionKey(item) ? null : sectionKey(item))} onUploading={setUploading}
        onChange={next => change(value.sections.map(row => sectionKey(row) === sectionKey(item) ? next : row))} onMove={move} onRemove={() => change(value.sections.filter(row => sectionKey(row) !== sectionKey(item)))} onDuplicate={() => { const copy = { ...structuredClone(item), id: 'widget-' + crypto.randomUUID() }; const items = [...value.sections]; items.splice(index + 1, 0, copy); change(items); setExpanded(copy.id); }} />)}</ol></SortableContext></DndContext>
      {!value.sections.length && <p className="widget-help">حداقل یک جزء به این ویجت اضافه کنید.</p>}
      {conflict && <p className="widget-error" role="alert">{conflict}</p>}
      {!parseGlobalWidget(value) && <p className="widget-error" role="alert">نام، اجزا و تنظیمات ویجت را تکمیل کنید؛ CSS نامعتبر قابل ذخیره نیست.</p>}
    </div>
    <footer className="palette-footer"><p>این ذخیره، چیدمان‌های ذخیره‌نشده صفحه‌ها را منتشر نمی‌کند.</p><div><Button size="sm" disabled={busy || !valid} icon={<Save size={14} />} onClick={() => setConfirmation('save')}>{saving ? 'در حال ذخیره…' : 'ذخیره سراسری'}</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmation('cancel')}>لغو و بازگشت</Button></div></footer>
    <Modal isOpen={!!confirmation} title={confirmation === 'save' ? 'انتشار ویجت سراسری' : 'لغو ویرایش سراسری'} onClose={() => { if (!busy) setConfirmation(null); }} size="sm" footer={<><Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>ادامه ویرایش</Button><Button size="sm" disabled={busy || (confirmation === 'save' && !valid)} onClick={() => { if (confirmation === 'save') { setConfirmation(null); void onSave(); } else onCancel(); }}>{confirmation === 'save' ? 'تأیید و انتشار' : 'لغو تغییرات'}</Button></>}>
      <p className="global-confirm-copy">{confirmation === 'save' ? 'محتوا و ظاهر این ویجت در تمام صفحه‌های متصل به آن به‌روز می‌شود. نمایش، موقعیت و سایر ویجت‌های صفحه‌ها تغییری نمی‌کنند.' : 'تغییرات این ویرایش سراسری کنار گذاشته می‌شوند. پیش‌نویس صفحه‌های شما حفظ خواهد شد.'}</p>
    </Modal>
  </section>;
}
