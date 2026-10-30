import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { catalogIconHref } from './iconCatalog';
import { iconLabel, legacyIconTargets, searchPickerIcons } from './iconPickerCatalog';
import type { NavigationIcon } from './navigationSettings';
import './icon-picker.css';

export function IconPreview({ name, size = 24 }: { name: NavigationIcon; size?: number }) {
  const href = catalogIconHref(name.startsWith('lucide:') ? name : 'lucide:'+legacyIconTargets[name]);
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><use href={href}/></svg>;
}

const batchSize = 60;
export function IconPicker({ value, label, fieldTitle = 'آیکون', disabled, onChange, onReset }: { value:NavigationIcon; label:string; fieldTitle?:string; disabled?:boolean; onChange:(icon:NavigationIcon)=>void; onReset?:()=>void }) {
  const [open,setOpen] = useState(false), [query,setQuery] = useState(''), [visibleCount,setVisibleCount] = useState(batchSize);
  const results = useMemo(()=>{
    const found = searchPickerIcons(query);
    return found.includes(value) ? [value,...found.filter(icon=>icon!==value)] : found;
  },[query,value]);
  const loadMore = () => setVisibleCount(count=>Math.min(count+batchSize,results.length));
  function showPicker() { setQuery(''); setVisibleCount(batchSize); setOpen(true); }
  return <div className="widget-field"><span>{fieldTitle}</span><div className="icon-picker-control">
    <button type="button" className="icon-picker-trigger" disabled={disabled} aria-label={label} aria-haspopup="dialog" aria-expanded={open} title={iconLabel(value)} onClick={showPicker}><IconPreview name={value}/><ChevronDown size={15}/></button>
    {onReset && <button type="button" className="icon-picker-reset" disabled={disabled} onClick={onReset} aria-label={'بازنشانی '+label} title="آیکون پیش‌فرض"><RotateCcw size={15}/></button>}</div>
    {createPortal(<Modal isOpen={open} onClose={()=>setOpen(false)} title="انتخاب آیکون" description="آیکون را انتخاب کنید؛ تغییر بلافاصله در پیش‌نمایش دیده می‌شود." size="xl" className="icon-picker-modal" footer={<div className="icon-picker-footer"><span aria-live="polite">{Math.min(visibleCount,results.length).toLocaleString('fa-IR')} از {results.length.toLocaleString('fa-IR')} آیکون</span><span>برای دیدن آیکون‌های بیشتر، پایین بروید.</span></div>}>
      <label className="icon-picker-search"><Search size={18}/><input type="search" aria-label="جست‌وجوی آیکون" placeholder="جست‌وجو به فارسی یا انگلیسی…" value={query} onChange={event=>{setQuery(event.target.value);setVisibleCount(batchSize);}}/></label>
      <div key={query} className="icon-picker-scroll" role="region" aria-label="فهرست آیکون‌ها" tabIndex={0} onScroll={event=>{const el=event.currentTarget;if(el.scrollHeight-el.scrollTop-el.clientHeight<100)loadMore();}}>
      {results.length ? <div className="icon-picker-grid" role="group" aria-label="آیکون‌های قابل انتخاب">{results.slice(0,visibleCount).map(icon=><button key={icon} type="button" aria-label={iconLabel(icon)} aria-pressed={value===icon} title={iconLabel(icon)} onClick={()=>{onChange(icon);setOpen(false);}}><IconPreview name={icon}/></button>)}</div> : <p className="icon-picker-empty" role="status">آیکونی پیدا نشد. یک واژه دیگر امتحان کنید.</p>}
      {visibleCount<results.length && <button type="button" className="icon-picker-more" onClick={loadMore}>نمایش آیکون‌های بیشتر</button>}
      </div>
    </Modal>,document.body)}
  </div>;
}
