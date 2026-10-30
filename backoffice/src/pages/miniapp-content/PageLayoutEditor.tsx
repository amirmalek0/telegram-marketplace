import { useEffect, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Layers3, Plus, RotateCcw, Save, Eye, Globe2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button, Modal } from '@/components/ui';
import { defaultPageLayout, pageForPath, pageIds, pageLabels, pageLayoutPrefix, parsePageLayout, sectionDefinition, sectionKey, type PageId, type PageLayout, type PageSection } from './pageLayouts';
import { defaultShopArrangement, parseShopArrangement, shopArrangementKey } from './shopArrangement';
import { defaultShopDesigns, parseShopDesigns, shopDesignsKey } from './shopDesigns';
import { PageLayoutRow } from './PageLayoutRow';
import { WidgetLibrary } from './WidgetLibrary';
import './shop-arrangement.css';
import './page-layout-editor.css';

import { customCssError, isTextWidgetType, newTextWidget } from './textWidgets';
import { imageWidgetType, newImageWidget } from './imageWidgets';
import { globalWidgetPrefix, readGlobalWidgets, globalLayoutError, independentSections, newGlobalReference, parseGlobalWidget, reusableSection, type GlobalWidget, type GlobalWidgets } from './globalWidgets';
import { GlobalWidgetEditor } from './GlobalWidgetEditor';
import './global-widgets.css';
import { appearanceCssError } from './widgetAppearance';
import { removeGlobalWidgetFromLayouts } from './globalWidgets';

export interface WidgetSelection { id: string; page: PageId; request: number }
export type LayoutDrafts = Record<PageId, PageLayout>;
const initialLayouts = () => Object.fromEntries(pageIds.map(page => [page, defaultPageLayout(page)])) as LayoutDrafts;
const same = (left: PageLayout, right: PageLayout) => JSON.stringify(left) === JSON.stringify(right);
interface GlobalEdit { id: string; value: GlobalWidget; isNew: boolean; source?: { page: PageId; keys: string[]; referenceId: string } }
function replaceWithGlobal(layout: PageLayout, keys: string[], widgetId: string, referenceId = 'widget-global-preview'): PageLayout {
  const reference = { ...newGlobalReference(widgetId), id: referenceId };
  let inserted = false;
  return { version: 1, sections: layout.sections.flatMap(item => {
    if (!keys.includes(sectionKey(item))) return [item];
    if (inserted) return [];
    inserted = true; return [reference];
  }) };
}

export function PageLayoutEditor({ pathname, selection, onPreview, onOpenPage, onGlobals }: { onGlobals: (widgets: GlobalWidgets) => void; pathname?: string; selection?: WidgetSelection; onPreview: (layouts: LayoutDrafts) => void; onOpenPage: (page: PageId) => void }) {
  const [page, setPage] = useState<PageId>(pageForPath(pathname || '/'));
  const [drafts, setDrafts] = useState(initialLayouts);
  const [saved, setSaved] = useState(initialLayouts);
  const [globals, setGlobals] = useState<GlobalWidgets>({});
  const [editingGlobal, setEditingGlobal] = useState<GlobalEdit | null>(null);
  const [deleteGlobalId, setDeleteGlobalId] = useState<string | null>(null);
  const [deletePublishedPages, setDeletePublishedPages] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = saving || uploading;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dirtyPages = pageIds.filter(id => !same(drafts[id], saved[id]));
  const dirty = dirtyPages.includes(page);
  const draft = drafts[page];
  const linkedError = globalLayoutError(draft, globals);
  const valid = !!parsePageLayout(draft, page) && !linkedError;
  useEffect(() => setSelected([]), [page]);
  useEffect(() => {
    if (!deleteGlobalId) return;
    let active = true;
    setDeleteLoading(true); setDeleteError(false); setDeletePublishedPages([]);
    // Refresh impact before confirmation; another editor may have linked it.
    apiClient.get<{ data: Record<string, string> }>('/miniapp-content').then(({ data }) => {
      const pages = Object.entries(data.data).flatMap(([key, value]) => {
        if (!key.startsWith(pageLayoutPrefix)) return [];
        const layout = JSON.parse(value);
        return Array.isArray(layout.sections) && layout.sections.some((item: PageSection) => item?.type === 'global.widget' && item.widgetId === deleteGlobalId) ? [key.slice(pageLayoutPrefix.length)] : [];
      });
      if (active) setDeletePublishedPages(pages);
    }).catch(() => { if (active) setDeleteError(true); })
      .finally(() => { if (active) setDeleteLoading(false); });
    return () => { active = false; };
  }, [deleteGlobalId]);

  useEffect(() => { if (pathname) setPage(pageForPath(pathname)); }, [pathname]);
  useEffect(() => {
    if (!selection) return;
    setPage(selection.page); setExpandedId(selection.id);
    const timer = window.setTimeout(() => document.getElementById('layout-' + selection.id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 100);
    return () => window.clearTimeout(timer);
  }, [selection]);
  useEffect(() => {
    let active = true;
    setError(false);
    apiClient.get<{ data: Record<string, string> }>('/miniapp-content').then(({ data }) => {
      if (!active) return;
      const layouts = initialLayouts();
      // Migrate the existing shop presentation in memory without changing saved data.
      const arrangement = parseShopArrangement(data.data[shopArrangementKey]) ?? defaultShopArrangement;
      const designs = parseShopDesigns(data.data[shopDesignsKey]) ?? defaultShopDesigns;
      layouts.shop = { version: 1, sections: arrangement.order.map(section => ({ type: 'catalog.' + section, visible: !arrangement.hidden.includes(section), design: designs[section] })) };
      for (const id of pageIds) layouts[id] = parsePageLayout(data.data[pageLayoutPrefix + id], id) ?? layouts[id];
      setGlobals(readGlobalWidgets(data.data));
      setDrafts(layouts); setSaved(structuredClone(layouts)); setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => {
    if (!loaded) return;
    const preview = structuredClone(drafts);
    const library = structuredClone(globals);
    if (editingGlobal) {
      library[editingGlobal.id] = structuredClone(editingGlobal.value);
      if (editingGlobal.source) {
        const source = editingGlobal.source;
        preview[source.page] = replaceWithGlobal(preview[source.page], source.keys, editingGlobal.id, source.referenceId);
      } else if (!preview[page].sections.some(item => item.widgetId === editingGlobal.id)) {
        preview[page].sections = [...preview[page].sections.filter(item => sectionDefinition(item.type)?.required), { ...newGlobalReference(editingGlobal.id), id: 'widget-global-preview' }];
      }
    }
    for (const widget of Object.values(library)) for (const item of widget.sections) {
      if (item.text && customCssError(item.text.css)) item.text.css = '';
      if (item.image && customCssError(item.image.css)) item.image.css = '';
      if (item.appearance && appearanceCssError(item.appearance.css)) item.appearance.css = '';
    }
    for (const layout of Object.values(preview)) for (const item of layout.sections) {
      if (item.text && customCssError(item.text.css)) item.text.css = '';
      if (item.image && customCssError(item.image.css)) item.image.css = '';
      if (item.appearance && appearanceCssError(item.appearance.css)) item.appearance.css = '';
    }
    onGlobals(library); onPreview(preview);
  }, [drafts, loaded, onPreview, globals, editingGlobal, page, onGlobals]);
  const hasChanges = dirtyPages.length > 0 || !!editingGlobal;
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  const change = (sections: PageSection[]) => {
    if (!loaded || saving) return;
    setDrafts(current => ({ ...current, [page]: { version: 1, sections } }));
  };
  const move = (from: number, to: number) => {
    if (from < 0 || to < 0 || from >= draft.sections.length || to >= draft.sections.length) return;
    change(arrayMove(draft.sections, from, to));
  };
  const dragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) move(draft.sections.findIndex(item => sectionKey(item) === active.id), draft.sections.findIndex(item => sectionKey(item) === over.id));
  };
  const save = async () => {
    if (!loaded || !dirty || busy || !valid) return;
    const target = page;
    const next = structuredClone(draft);
    setSaving(true);
    try {
      await apiClient.put('/miniapp-content/' + pageLayoutPrefix + target, { value: JSON.stringify(next) });
      setSaved(current => ({ ...current, [target]: next }));
      toast.success('چیدمان ' + pageLabels[target] + ' ذخیره شد');
    } catch (error) { toast.error(isAxiosError(error) ? error.response?.data?.error || 'ذخیره چیدمان ناموفق بود' : 'ذخیره چیدمان ناموفق بود'); }
    finally { setSaving(false); }
  };
  const addWidget = (type: string) => {
    const item: PageSection = type === imageWidgetType ? newImageWidget() : isTextWidgetType(type) ? newTextWidget(type) : { type, visible: true, design: sectionDefinition(type)!.designs[0] };
    change([...draft.sections, item]);
    setExpandedId(sectionKey(item)); setLibraryOpen(false);
    window.setTimeout(() => document.getElementById('layout-' + sectionKey(item))?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 100);
  };
  const addGlobal = (id: string) => {
    const reference = newGlobalReference(id);
    const layout: PageLayout = { version: 1, sections: [...draft.sections, reference] };
    const error = globalLayoutError(layout, globals);
    if (error) { toast.error(error); return; }
    change(layout.sections); setExpandedId(reference.id!); setLibraryOpen(false);
  };
  const createGlobal = (keys: string[]) => {
    if (Object.keys(globals).length >= 100) { toast.error('حداکثر ۱۰۰ ویجت سراسری مجاز است'); return; }
    const items = draft.sections.filter(item => keys.includes(sectionKey(item)));
    const children = items.flatMap(item => item.type === 'global.widget' ? (globals[item.widgetId!]?.sections ?? []).map(child => ({ ...child, visible: item.visible && child.visible })) : [item]);
    if (!children.length || !children.every(reusableSection)) return;
    const value: GlobalWidget = { version: 1, name: 'ویجت تازه', sections: independentSections(children) };
    if (!parseGlobalWidget(value)) { toast.error('ابتدا تنظیمات ویجت‌های انتخاب‌شده را اصلاح کنید'); return; }
    setEditingGlobal({ id: 'widget-' + crypto.randomUUID(), value, isNew: true, source: { page, keys, referenceId: 'widget-' + crypto.randomUUID() } }); setLibraryOpen(false);
  };
  const openGlobal = (id: string) => { if (globals[id]) { setEditingGlobal({ id, value: structuredClone(globals[id]), isNew: false }); setLibraryOpen(false); } };
  const saveGlobal = async () => {
    if (!editingGlobal || !parseGlobalWidget(editingGlobal.value) || saving) return;
    const edit = structuredClone(editingGlobal);
    setSaving(true);
    try {
      await apiClient.put('/miniapp-content/' + globalWidgetPrefix + edit.id, { value: JSON.stringify(edit.value) });
      setGlobals(current => ({ ...current, [edit.id]: edit.value }));
      if (edit.source) {
        const source = edit.source;
        setDrafts(current => ({ ...current, [source.page]: replaceWithGlobal(current[source.page], source.keys, edit.id, source.referenceId) }));
      }
      setEditingGlobal(null); setSelected([]);
      toast.success(edit.isNew ? 'ویجت سراسری ساخته شد؛ برای انتشار جایگاه آن، صفحه را ذخیره کنید' : 'ویجت سراسری در همه صفحه‌های متصل به‌روز شد');
    } catch (error) { toast.error(isAxiosError(error) ? error.response?.data?.error || 'ذخیره سراسری ناموفق بود' : 'ذخیره سراسری ناموفق بود'); }
    finally { setSaving(false); }
  };
  const deleteUsage = deleteGlobalId ? [...new Set([...deletePublishedPages, ...pageIds.filter(id => drafts[id].sections.some(item => item.type === 'global.widget' && item.widgetId === deleteGlobalId))])] : [];
  const deleteGlobal = async () => {
    if (!deleteGlobalId || busy || deleteLoading || deleteError) return;
    const id = deleteGlobalId;
    setSaving(true);
    try {
      await apiClient.delete('/miniapp-content/' + globalWidgetPrefix + id, { params: { cascade: true } });
      setGlobals(current => { const next = { ...current }; delete next[id]; return next; });
      setDrafts(current => removeGlobalWidgetFromLayouts(current, id));
      setSaved(current => removeGlobalWidgetFromLayouts(current, id));
      setSelected(current => current.filter(key => !drafts[page].sections.some(item => sectionKey(item) === key && item.type === 'global.widget' && item.widgetId === id)));
      if (editingGlobal?.id === id) setEditingGlobal(null);
      setDeleteGlobalId(null);
      toast.success('ویجت از کتابخانه و تمام صفحه‌های مرتبط حذف شد');
    } catch (error) { toast.error(isAxiosError(error) ? error.response?.data?.error || 'حذف ویجت ناموفق بود' : 'حذف ویجت ناموفق بود'); }
    finally { setSaving(false); }
  };
  const deleteDialog = <Modal isOpen={!!deleteGlobalId} title="حذف ویجت سراسری" size="sm" onClose={() => { if (!busy) setDeleteGlobalId(null); }} footer={<><Button variant="secondary" size="sm" disabled={busy} onClick={() => setDeleteGlobalId(null)}>انصراف</Button><Button variant="danger" size="sm" disabled={busy || deleteLoading || deleteError} onClick={() => void deleteGlobal()}>{saving ? 'در حال حذف…' : 'تأیید و حذف از همه صفحه‌ها'}</Button></>}>
    <p className="global-confirm-copy">ویجت «{deleteGlobalId ? globals[deleteGlobalId]?.name : ''}» از کتابخانه و تمام صفحه‌هایی که از آن استفاده می‌کنند حذف می‌شود. این تغییر بلافاصله منتشر می‌شود و قابل بازگشت نیست.</p>
    {deleteLoading ? <p role="status">در حال بررسی صفحه‌های مرتبط…</p> : deleteError ? <p className="widget-error" role="alert">دریافت صفحه‌های مرتبط ناموفق بود. پنجره را ببندید و دوباره تلاش کنید.</p> : <div className="global-delete-warning"><strong>{deleteUsage.length ? 'صفحه‌های مرتبط (منتشرشده یا پیش‌نویس):' : 'این ویجت در هیچ صفحه‌ای استفاده نشده است.'}</strong>{!!deleteUsage.length && <ul>{deleteUsage.map(id => <li key={id}>{pageLabels[id as PageId] ?? id}</li>)}</ul>}<p>تمام جایگاه‌های این ویجت حذف می‌شوند؛ سایر ویجت‌ها، ترتیب آن‌ها و تغییرات ذخیره‌نشده شما حفظ می‌شوند. نسخه‌های مستقل تغییری نمی‌کنند.</p></div>}
  </Modal>;
  const globalUsage = editingGlobal ? pageIds.filter(id => saved[id].sections.some(item => item.widgetId === editingGlobal.id)).map(id => pageLabels[id]) : [];
  const globalConflict = editingGlobal ? pageIds.map(id => {
    const library = { ...globals, [editingGlobal.id]: editingGlobal.value };
    const layout = editingGlobal.source?.page === id ? replaceWithGlobal(drafts[id], editingGlobal.source.keys, editingGlobal.id) : drafts[id];
    const error = globalLayoutError(layout, library) || globalLayoutError(saved[id], library);
    return error ? pageLabels[id] + ': ' + error : '';
  }).find(Boolean) : undefined;
  if (editingGlobal) return <><GlobalWidgetEditor key={editingGlobal.id} value={editingGlobal.value} isNew={editingGlobal.isNew} usage={globalUsage} conflict={globalConflict} saving={saving} onChange={value => setEditingGlobal(current => current ? { ...current, value } : current)} onSave={saveGlobal} onCancel={() => setEditingGlobal(null)} onDelete={() => setDeleteGlobalId(editingGlobal.id)} />{deleteDialog}</>;
  return <section className="palette-editor" aria-label="صفحه‌ها و ویجت‌ها">
    <div className="palette-editor-heading"><Layers3 size={19} /><h2>صفحه‌ها و ویجت‌ها</h2>{loaded && <span className={`palette-state ${hasChanges ? 'is-dirty' : ''}`} role="status">{hasChanges ? `${dirtyPages.length.toLocaleString('fa-IR')} صفحه ذخیره نشده` : 'ذخیره‌شده'}</span>}</div>
    <div className="palette-scroll">
      <div className="layout-page-selector"><label htmlFor="layout-page">صفحه در حال ویرایش</label><select id="layout-page" value={page} disabled={busy} onChange={event => { const id = event.target.value as PageId; setPage(id); setExpandedId(null); setLibraryOpen(false); onOpenPage(id); }}>
        <optgroup label="صفحه‌های اصلی">{pageIds.slice(0, 8).map(id => <option key={id} value={id}>{pageLabels[id]}{dirtyPages.includes(id) ? ' • ذخیره نشده' : ''}</option>)}</optgroup>
        <optgroup label="جزئیات و فرم‌ها">{pageIds.slice(8).map(id => <option key={id} value={id}>{pageLabels[id]}{dirtyPages.includes(id) ? ' • ذخیره نشده' : ''}</option>)}</optgroup>
      </select></div>
      {error ? <p role="alert">دریافت چیدمان‌ها ناموفق بود. <button type="button" onClick={() => setAttempt(value => value + 1)}>تلاش دوباره</button></p> : !loaded ? <p role="status">در حال دریافت چیدمان‌ها…</p> : <>
        <div className="layout-page-heading"><div><h3>چیدمان {pageLabels[page]}</h3><small><Eye size={13} /> {draft.sections.filter(item => item.visible).length.toLocaleString('fa-IR')} نمایان از {draft.sections.length.toLocaleString('fa-IR')} ویجت</small></div><Button size="sm" disabled={busy} icon={<Plus size={15} />} onClick={() => setLibraryOpen(value => !value)} aria-expanded={libraryOpen}>افزودن ویجت</Button></div>
        {libraryOpen && <WidgetLibrary key={page} page={page} sections={draft.sections} disabled={busy} onAdd={addWidget} onClose={() => setLibraryOpen(false)} globals={globals} onAddGlobal={addGlobal} onEditGlobal={openGlobal} onDeleteGlobal={setDeleteGlobalId} />}
        <div className="global-group-toolbar"><span>{selected.length ? `${selected.length.toLocaleString('fa-IR')} ویجت انتخاب شده` : 'برای ساخت گروه سراسری، ویجت‌ها را انتخاب کنید'}</span><div><button type="button" disabled={busy || !selected.length} onClick={() => createGlobal(selected)}><Globe2 size={14} /> ساخت ویجت سراسری</button>{!!selected.length && <button type="button" onClick={() => setSelected([])}>لغو انتخاب</button>}</div></div>
        <p className="layout-sort-hint">برای جابه‌جایی بکشید؛ برای طراحی، ویجت را باز کنید.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={draft.sections.map(sectionKey)} strategy={verticalListSortingStrategy}>
            <ol className="layout-section-list">{draft.sections.map((item, index) => <PageLayoutRow key={page + sectionKey(item)} item={item} index={index} total={draft.sections.length} disabled={busy} onUploading={setUploading}
              globalName={globals[item.widgetId!]?.name} globalIcon={globals[item.widgetId!]?.icon} onGlobalEdit={() => openGlobal(item.widgetId!)} onDetach={() => { const children = independentSections(globals[item.widgetId!]?.sections ?? []).map(child => ({ ...child, visible: child.visible && item.visible })); change(draft.sections.flatMap(row => sectionKey(row) === sectionKey(item) ? children : [row])); }}
              selected={selected.includes(sectionKey(item))} onSelect={reusableSection(item) || item.type === 'global.widget' ? () => setSelected(current => current.includes(sectionKey(item)) ? current.filter(key => key !== sectionKey(item)) : [...current, sectionKey(item)]) : undefined}
              onSaveGlobal={reusableSection(item) ? () => createGlobal([sectionKey(item)]) : undefined}
              expanded={expandedId === sectionKey(item)} onEdit={() => setExpandedId(expandedId === sectionKey(item) ? null : sectionKey(item))}
              onDuplicate={() => { const copy = { ...structuredClone(item), id: 'widget-' + crypto.randomUUID() }; const items = [...draft.sections]; items.splice(index + 1, 0, copy); change(items); setExpandedId(copy.id); }}
              onMove={move} onChange={next => setDrafts(current => ({ ...current, [page]: { version: 1, sections: current[page].sections.map(row => sectionKey(row) === sectionKey(item) ? next : row) } }))}
              onRemove={() => { change(draft.sections.filter(row => sectionKey(row) !== sectionKey(item))); setSelected(current => current.filter(key => key !== sectionKey(item))); }} />)}</ol>
          </SortableContext>
        </DndContext>
        {!draft.sections.some(item => item.visible) && <p className="palette-warning" role="status">هیچ ویجت فعالی در این صفحه وجود ندارد.</p>}
        {!valid && <p className="widget-error" role="alert">{linkedError || 'تنظیمات ویجت‌ها را بررسی کنید؛ CSS نامعتبر یا حجم بیش از ۲۵۶ کیلوبایت قابل ذخیره نیست.'}</p>}
        <button type="button" className="palette-reset" disabled={busy} onClick={() => setDrafts(current => ({ ...current, [page]: defaultPageLayout(page) }))}><RotateCcw size={14} /> بازگشت این صفحه به ساختار پیش‌فرض</button>
      </>}
    </div>
    <footer className="palette-footer"><p>تغییرات بلافاصله در پیش‌نمایش دیده می‌شوند؛ برای انتشار، همین صفحه را ذخیره کنید.</p><div>
      <Button size="sm" disabled={!loaded || !dirty || busy || !valid} icon={<Save size={14} />} onClick={save}>{saving ? 'در حال ذخیره…' : 'ذخیره ' + pageLabels[page]}</Button>
      <Button size="sm" variant="secondary" disabled={!dirty || busy} onClick={() => setDrafts(current => ({ ...current, [page]: structuredClone(saved[page]) }))}>لغو تغییرات صفحه</Button>
    </div></footer>
    {deleteDialog}
  </section>;
}
