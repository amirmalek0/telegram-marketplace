import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Boxes, GripVertical, LayoutList, RotateCcw, Save, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { defaultShopArrangement, defaultShopSections, parseShopArrangement, shopArrangementKey, type ShopArrangement, type ShopSection } from './shopArrangement';
import './shop-arrangement.css';

const labels: Record<ShopSection, string> = { categories: 'دسته‌بندی‌ها', products: 'تازه‌ترین محصولات' };

function SectionRow({ section, index, disabled, visible, onToggle, onMove }: { section: ShopSection; index: number; disabled: boolean; visible: boolean; onToggle: (section: ShopSection) => void; onMove: (from: number, to: number) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section, disabled });
  return <li ref={setNodeRef} className={`shop-arrangement-row ${isDragging ? 'is-dragging' : ''} ${!visible ? 'is-hidden' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type="button" className="shop-arrangement-handle" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={disabled} aria-label={`جابه‌جایی ${labels[section]}`}><GripVertical size={19} /></button>
    <span className="shop-arrangement-icon">{section === 'categories' ? <Boxes size={21} /> : <ShoppingBag size={21} />}</span>
    <span className="shop-arrangement-label"><strong>{labels[section]}</strong><small>{visible ? 'نمایش در فروشگاه' : 'پنهان از فروشگاه'}</small></span>
    <button type="button" role="switch" aria-checked={visible} aria-label={`نمایش ${labels[section]}`} className="shop-section-toggle" disabled={disabled} onClick={() => onToggle(section)}><span /></button>
    <div className="shop-arrangement-arrows">
      <button type="button" disabled={disabled || index === 0} aria-label={`انتقال ${labels[section]} به بالا`} onClick={() => onMove(index, index - 1)}><ArrowUp size={16} /></button>
      <button type="button" disabled={disabled || index === 1} aria-label={`انتقال ${labels[section]} به پایین`} onClick={() => onMove(index, index + 1)}><ArrowDown size={16} /></button>
    </div>
  </li>;
}

export function ShopArrangementEditor({ onPreview, onOpenShop }: { onPreview: (arrangement: ShopArrangement) => void; onOpenShop: () => void }) {
  const [draft, setDraft] = useState(defaultShopArrangement);
  const [saved, setSaved] = useState(defaultShopArrangement);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    let active = true;
    setError(false);
    apiClient.get<{ data: Record<string, string> }>('/miniapp-content').then(({ data }) => {
      if (!active) return;
      const order = parseShopArrangement(data.data[shopArrangementKey]) ?? defaultShopArrangement;
      setDraft(order); setSaved(order); setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => { if (loaded) onPreview(draft); }, [draft, loaded, onPreview]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const move = (from: number, to: number) => {
    if (saving || from < 0 || to < 0 || from >= draft.order.length || to >= draft.order.length) return;
    setDraft(current => ({ ...current, order: arrayMove(current.order, from, to) }));
    onOpenShop();
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(draft.order.indexOf(active.id as ShopSection), draft.order.indexOf(over.id as ShopSection));
  };
  const toggle = (section: ShopSection) => {
    if (saving) return;
    setDraft(current => ({ ...current, hidden: defaultShopSections.filter(item => item === section ? !current.hidden.includes(item) : current.hidden.includes(item)) }));
    onOpenShop();
  };
  const save = async () => {
    if (!loaded || !dirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/miniapp-content/${shopArrangementKey}`, { value: JSON.stringify(draft) });
      setSaved(draft); toast.success('چیدمان فروشگاه ذخیره شد');
    } catch { toast.error('ذخیره چیدمان ناموفق بود؛ دوباره تلاش کنید'); }
    finally { setSaving(false); }
  };

  return <section className="palette-editor" aria-label="چیدمان فروشگاه">
    <div className="palette-editor-heading"><LayoutList size={19} /><h2>چیدمان فروشگاه</h2>{loaded && <span className={`palette-state ${dirty ? 'is-dirty' : ''}`} role="status">{dirty ? 'ذخیره نشده' : 'ذخیره‌شده'}</span>}</div>
    <div className="palette-scroll">
      <p className="palette-custom-note">با کلید هر بخش آن را نمایش دهید یا پنهان کنید. برای تغییر ترتیب، دستگیره را بکشید یا از فلش‌ها استفاده کنید. پنهان کردن فقط صفحه فروشگاه را تغییر می‌دهد و محصول یا دسته‌بندی را حذف نمی‌کند.</p>
      <Button variant="secondary" size="sm" onClick={onOpenShop}>نمایش فروشگاه در پیش‌نمایش</Button>
      {error ? <div className="palette-load-state" role="alert">دریافت چیدمان ناموفق بود. <button type="button" onClick={() => setAttempt(value => value + 1)}>تلاش دوباره</button></div> : !loaded ? <p className="palette-load-state" role="status">در حال دریافت چیدمان…</p> : <>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd} accessibility={{ screenReaderInstructions: { draggable: 'برای گرفتن بخش کلید فاصله را بزنید، با فلش بالا و پایین جابه‌جا کنید و با فاصله رها کنید. برای لغو Escape را بزنید.' }, announcements: {
          onDragStart: ({ active }) => `${labels[active.id as ShopSection]} انتخاب شد.`,
          onDragOver: ({ over }) => over ? `موقعیت ${draft.order.indexOf(over.id as ShopSection) + 1}` : undefined,
          onDragEnd: ({ over }) => over ? 'ترتیب پیش‌نمایش تغییر کرد؛ برای انتشار ذخیره کنید.' : 'جابه‌جایی لغو شد.',
          onDragCancel: () => 'جابه‌جایی لغو شد.',
        } }}>
          <SortableContext items={draft.order} strategy={verticalListSortingStrategy}><ol className="shop-arrangement-list">{draft.order.map((section, index) => <SectionRow key={section} section={section} index={index} disabled={saving} visible={!draft.hidden.includes(section)} onToggle={toggle} onMove={move} />)}</ol></SortableContext>
        </DndContext>
        {draft.hidden.length === 2 && <p className="palette-warning" role="status">هر دو بخش پنهان‌اند؛ صفحه فروشگاه بدون دسته‌بندی و محصول نمایش داده می‌شود.</p>}
        <button type="button" className="palette-reset" disabled={saving} onClick={() => { setDraft(structuredClone(defaultShopArrangement)); onOpenShop(); }}><RotateCcw size={14} /> بازگشت به چیدمان پیش‌فرض</button>
      </>}
    </div>
    <footer className="palette-footer"><p>تغییرات تا زدن «ذخیره چیدمان» فقط در پیش‌نمایش دیده می‌شود.</p><div>
      <Button size="sm" icon={<Save size={14} />} disabled={!loaded || !dirty || saving} onClick={save}>{saving ? 'در حال ذخیره…' : 'ذخیره چیدمان'}</Button>
      <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={() => { setDraft(structuredClone(saved)); onOpenShop(); }}>لغو چیدمان</Button>
    </div></footer>
  </section>;
}
