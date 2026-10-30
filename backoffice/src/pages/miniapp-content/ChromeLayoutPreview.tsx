import { Bell, Crown, MessageCircle, Moon, Search, Store, UserRound, Wallet } from 'lucide-react';
import type { ChromeLayoutPreset } from './chromeLayoutPresets';
import './chrome-layout-presets.css';
import './chrome-positioning.css';

// The same structural CSS drives these inert miniatures and the real Mini App.
export function ChromeLayoutPreview({ kind, preset, independent = false }: { kind:'header'|'navigation'; preset:ChromeLayoutPreset; independent?:boolean }) {
  return <span className={`structural-preview preview-${kind}`} aria-hidden="true">
    <span className="structural-stage" dir="rtl">
      {kind === 'header' ? <span className="chrome-host" data-position={independent ? preset.family : undefined} data-geometry={independent ? preset.variant : undefined} data-structure={independent ? undefined : preset.family} data-variant={independent ? undefined : preset.variant} data-header-layout="preset">
        <span className="chrome-header">
          <span className="chrome-brand"><span className="chrome-logo"><Store size={24}/></span><span className="chrome-brand-copy"><span className="chrome-title">فروشگاه شما</span></span></span>
          <span className="chrome-tools">{[[Moon,'پوسته'],[Bell,'اعلان‌ها'],[Search,'جست‌وجو']].map(([Icon,label]) => {
            const ToolIcon = Icon as typeof Moon;
            return <span className="chrome-tool" key={String(label)}><span className="chrome-action"><ToolIcon size={20}/><span className="header-action-caption">{String(label)}</span></span></span>;
          })}</span>
        </span>
      </span> : <>
        <span className="preview-content-lines"><i/><i/><i/></span>
        <span className="chrome-nav" data-position={independent ? preset.family : undefined} data-geometry={independent ? preset.variant : undefined} data-structure={independent ? undefined : preset.family} data-variant={independent ? undefined : preset.variant} data-many="true" style={{position:'absolute',bottom:12,left:12,right:12}}>
          {[Store,Wallet,Crown,MessageCircle,UserRound].map((NavIcon,index) => <span key={index} className={`nav-item ${index === 2 ? 'active' : ''}`} data-group-start={index === 3} data-group-end={index === 2}><span className="nav-icon"><NavIcon size={21}/></span><span data-nav-label>{['فروشگاه','کیف پول','VIP','تیکت‌ها','پروفایل'][index]}</span></span>)}
        </span>
      </>}
    </span>
  </span>;
}
