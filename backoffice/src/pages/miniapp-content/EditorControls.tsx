import { useState } from 'react';
import { Layers3, Palette as PaletteIcon } from 'lucide-react';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { PageLayoutEditor, type LayoutDrafts } from './PageLayoutEditor';
import { pageForPath, type PageId } from './pageLayouts';
import type { Palette, PaletteMode } from './palette';

export function EditorControls({ onPalette, onLayouts, onOpenPage, pathname }: { onPalette: (palette: Palette | null, mode: PaletteMode) => void; onLayouts: (layouts: LayoutDrafts) => void; onOpenPage: (page: PageId) => void; pathname?: string }) {
  const [panel, setPanel] = useState<'appearance' | 'pages'>('appearance');
  return <div className="editor-control-panels">
    <div className="editor-control-switch" role="group" aria-label="بخش تنظیمات مینی‌اپ">
      <button type="button" aria-pressed={panel === 'appearance'} onClick={() => setPanel('appearance')}><PaletteIcon size={16} /> ظاهر و رنگ‌ها</button>
      <button type="button" aria-pressed={panel === 'pages'} onClick={() => { setPanel('pages'); onOpenPage(pageForPath(pathname || '/')); }}><Layers3 size={16} /> صفحه‌ها و بخش‌ها</button>
    </div>
    <div className="editor-control-panel" hidden={panel !== 'appearance'}><ColorPaletteEditor onPreview={onPalette} /></div>
    <div className="editor-control-panel" hidden={panel !== 'pages'}><PageLayoutEditor pathname={pathname} onPreview={onLayouts} onOpenPage={onOpenPage} /></div>
  </div>;
}
