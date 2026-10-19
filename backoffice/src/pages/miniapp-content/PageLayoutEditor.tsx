import { useEffect, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Check, Layers3, Plus, RotateCcw, Save, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { defaultPageLayout, pageForPath, pageIds, pageLabels, pageLayoutPrefix, parsePageLayout, sectionLibrary, type PageId, type PageLayout, type PageSection } from './pageLayouts';
import { defaultShopArrangement, parseShopArrangement, shopArrangementKey } from './shopArrangement';
import { defaultShopDesigns, parseShopDesigns, shopDesignsKey } from './shopDesigns';
import { PageLayoutRow } from './PageLayoutRow';
import './shop-arrangement.css';
import './page-layout-editor.css';

export type LayoutDrafts = Record<PageId, PageLayout>;
const initialLayouts = () => Object.fromEntries(pageIds.map(page => [page, defaultPageLayout(page)])) as LayoutDrafts;
const same = (left: PageLayout, right: PageLayout) => JSON.stringify(left) === JSON.stringify(right);
const normalize = (value: string) => value.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, '').trim();

export function PageLayoutEditor({ pathname, onPreview, onOpenPage }: { pathname?: string; onPreview: (layouts: LayoutDrafts) => void; onOpenPage: (page: PageId) => void }) {
  const [page, setPage] = useState<PageId>(pageForPath(pathname || '/'));
  const [drafts, setDrafts] = useState(initialLayouts);
  const [saved, setSaved] = useState(initialLayouts);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dirtyPages = pageIds.filter(id => !same(drafts[id], saved[id]));
  const dirty = dirtyPages.includes(page);
  const draft = drafts[page];

  useEffect(() => { if (pathname) setPage(pageForPath(pathname)); }, [pathname]);
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
      setDrafts(layouts); setSaved(structuredClone(layouts)); setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { if (loaded) onPreview(drafts); }, [drafts, loaded, onPreview]);
  const hasChanges = dirtyPages.length > 0;
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
    if (over && active.id !== over.id) move(draft.sections.findIndex(item => item.type === active.id), draft.sections.findIndex(item => item.type === over.id));
  };
  const save = async () => {
    if (!loaded || !dirty || saving) return;
    const target = page;
    const next = structuredClone(draft);
    setSaving(true);
    try {
      await apiClient.put('/miniapp-content/' + pageLayoutPrefix + target, { value: JSON.stringify(next) });
      setSaved(current => ({ ...current, [target]: next }));
      toast.success('چیدمان ' + pageLabels[target] + ' ذخیره شد');
    } catch { toast.error('ذخیره چیدمان ناموفق بود؛ دوباره تلاش کنید'); }
    finally { setSaving(false); }
  };
  const available = sectionLibrary.filter(section => (!section.page || section.page === page) && normalize(section.title).includes(normalize(query)));
  return <section className="palette-editor" aria-label="صفحه‌ها و کتابخانه بخش‌ها">
    <div className="palette-editor-heading"><Layers3 size={19} /><h2>صفحه‌ها و بخش‌ها</h2>{loaded && <span className={`palette-state ${hasChanges ? 'is-dirty' : ''}`} role="status">{hasChanges ? `${dirtyPages.length.toLocaleString('fa-IR')} صفحه ذخیره نشده` : 'ذخیره‌شده'}</span>}</div>
    <div className="palette-scroll">
      <div className="layout-page-grid" role="group" aria-label="انتخاب صفحه">
        {pageIds.map(id => <button type="button" key={id} aria-pressed={page === id} onClick={() => { setPage(id); setQuery(''); onOpenPage(id); }}>{pageLabels[id]}{dirtyPages.includes(id) && <i aria-label="ذخیره نشده" />}</button>)}
      </div>
      <p className="palette-custom-note">بخش‌ها را جابه‌جا، پنهان یا از کتابخانه اضافه کنید. هر صفحه مستقل ذخیره می‌شود. بخش‌های ضروری قفل هستند و محتوای حساب همیشه متعلق به همان کاربر است.</p>
      {error ? <p role="alert">دریافت چیدمان‌ها ناموفق بود. <button type="button" onClick={() => setAttempt(value => value + 1)}>تلاش دوباره</button></p> : !loaded ? <p role="status">در حال دریافت چیدمان‌ها…</p> : <>
        <div className="layout-page-heading"><h3>{pageLabels[page]}</h3><Button size="sm" variant="secondary" icon={<Plus size={15} />} onClick={() => setLibraryOpen(value => !value)} aria-expanded={libraryOpen}>کتابخانه بخش‌ها</Button></div>
        {libraryOpen && <section className="layout-library" aria-label="کتابخانه بخش‌ها">
          <label className="layout-library-search"><Search size={16} /><input value={query} placeholder="جست‌وجوی بخش…" aria-label="جست‌وجوی بخش" onChange={event => setQuery(event.target.value)} /></label>
          <div className="layout-library-grid">{available.map(section => {
            const exists = draft.sections.some(item => item.type === section.type);
            return <button type="button" key={section.type} disabled={saving || exists || draft.sections.length >= 24} onClick={() => change([...draft.sections, { type: section.type, visible: true, design: section.designs[0] }])}>
              {exists ? <Check size={16} /> : <Plus size={16} />}<span>{section.title}<small>{exists ? 'در این صفحه موجود است' : section.page ? 'ویژه این صفحه' : 'قابل استفاده در همه صفحه‌ها'}</small></span>
            </button>;
          })}</div>
          {!available.length && <p className="palette-custom-note">بخشی پیدا نشد.</p>}
          {draft.sections.length >= 24 && <p className="palette-warning">حداکثر ۲۴ بخش در هر صفحه مجاز است.</p>}
        </section>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
          <SortableContext items={draft.sections.map(item => item.type)} strategy={verticalListSortingStrategy}>
            <ol className="layout-section-list">{draft.sections.map((item, index) => <PageLayoutRow key={item.type} item={item} index={index} total={draft.sections.length} disabled={saving}
              onMove={move} onChange={next => change(draft.sections.map(row => row.type === item.type ? next : row))}
              onRemove={() => change(draft.sections.filter(row => row.type !== item.type))} />)}</ol>
          </SortableContext>
        </DndContext>
        {!draft.sections.some(item => item.visible) && <p className="palette-warning" role="status">هیچ بخش فعالی در این صفحه وجود ندارد.</p>}
        <button type="button" className="palette-reset" disabled={saving} onClick={() => setDrafts(current => ({ ...current, [page]: defaultPageLayout(page) }))}><RotateCcw size={14} /> بازگشت این صفحه به ساختار پیش‌فرض</button>
      </>}
    </div>
    <footer className="palette-footer"><p>تغییرات بلافاصله در پیش‌نمایش دیده می‌شوند؛ برای انتشار، همین صفحه را ذخیره کنید.</p><div>
      <Button size="sm" disabled={!loaded || !dirty || saving} icon={<Save size={14} />} onClick={save}>{saving ? 'در حال ذخیره…' : 'ذخیره ' + pageLabels[page]}</Button>
      <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={() => setDrafts(current => ({ ...current, [page]: structuredClone(saved[page]) }))}>لغو تغییرات صفحه</Button>
    </div></footer>
  </section>;
}
