import { Check } from 'lucide-react';
import { headerPositions, navigationPositions } from './chromePositioning';
import { ChromeLayoutPreview } from './ChromeLayoutPreview';
import './chrome-theme-gallery.css';

export function PositioningPicker({kind,value,onChange}:{kind:'header'|'navigation';value:string;onChange:(value:string)=>void}) {
  const options = kind === 'header' ? headerPositions : navigationPositions;
  return <div className="chrome-theme-gallery"><div className="header-theme-grid structural-theme-grid" role="group" aria-label={kind === 'header' ? 'چیدمان سربرگ' : 'چیدمان نوار پایین'}>
    {options.map(item=><button type="button" key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>
      <ChromeLayoutPreview kind={kind} independent preset={{family:item.id,variant:'default',label:item.label,description:''}}/>
      <strong>{item.label}{value===item.id&&<Check size={13}/>}</strong>
    </button>)}
  </div></div>;
}
