import { useEffect, useState } from 'react';
import { Layers3, LayoutTemplate, Palette as PaletteIcon, Navigation } from 'lucide-react';
import { NavigationEditor } from './NavigationEditor';
import type { NavigationSettings } from './navigationSettings';
import { HeaderEditor } from './HeaderEditor';
import type { HeaderSettings } from './headerSettings';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { PageLayoutEditor, type LayoutDrafts, type WidgetSelection } from './PageLayoutEditor';
import { pageForPath, type PageId } from './pageLayouts';
import type { Palette, PaletteMode } from './palette';
import type { GlobalWidgets } from './globalWidgets';

export function EditorControls({ onNavigation, onGlobals, onHeader, onPalette, onLayouts, onOpenPage, pathname, selection }: { onNavigation: (settings: NavigationSettings) => void; onGlobals: (widgets: GlobalWidgets) => void; onHeader: (settings: HeaderSettings) => void; onPalette: (palette: Palette | null, mode: PaletteMode) => void; onLayouts: (layouts: LayoutDrafts) => void; onOpenPage: (page: PageId) => void; pathname?: string; selection?: WidgetSelection }) {
  const [panel, setPanel] = useState<'appearance' | 'pages' | 'header' | 'navigation'>('appearance');
  useEffect(() => { if (selection) setPanel('pages'); }, [selection]);
  return <div className="editor-control-panels">
    <nav className="editor-control-switch" aria-label="بخش تنظیمات مینی‌اپ">
      <span className="editor-rail-label">شخصی‌سازی</span>
      <button type="button" aria-label="ظاهر و رنگ‌ها" aria-pressed={panel === 'appearance'} onClick={() => setPanel('appearance')}><PaletteIcon size={20} /><span>ظاهر و رنگ‌ها<small>هویت بصری فروشگاه</small></span></button>
      <button type="button" aria-label="صفحه‌ها و ویجت‌ها" aria-pressed={panel === 'pages'} onClick={() => { setPanel('pages'); onOpenPage(pageForPath(pathname || '/')); }}><Layers3 size={20} /><span>صفحه‌ها و ویجت‌ها<small>محتوا و چیدمان صفحه</small></span></button>
      <button type="button" aria-label="سربرگ" aria-pressed={panel === 'header'} onClick={() => setPanel('header')}><LayoutTemplate size={20} /><span>سربرگ<small>عنوان و ابزارهای ناوبری</small></span></button>
      <button type="button" aria-label="نوار پایین" aria-pressed={panel === 'navigation'} onClick={() => setPanel('navigation')}><Navigation size={20} /><span>نوار پایین<small>طرح، گزینه‌ها و رنگ‌ها</small></span></button>
    </nav>
    <div className="editor-control-body">
    <div className="editor-control-panel" hidden={panel !== 'navigation'}><NavigationEditor onPreview={onNavigation} /></div>
    <div className="editor-control-panel" hidden={panel !== 'header'}><HeaderEditor onPreview={onHeader} /></div>
    <div className="editor-control-panel" hidden={panel !== 'appearance'}><ColorPaletteEditor onPreview={onPalette} /></div>
    <div className="editor-control-panel" hidden={panel !== 'pages'}><PageLayoutEditor onGlobals={onGlobals} pathname={pathname} selection={selection} onPreview={onLayouts} onOpenPage={onOpenPage} /></div>
    </div>
  </div>;
}
