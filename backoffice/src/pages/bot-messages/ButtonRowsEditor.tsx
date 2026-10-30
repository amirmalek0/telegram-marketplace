import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { BotButton, BotTemplate, ButtonAction } from './types';
import { actionLabels, styleOptions } from './types';
import { move } from './helpers';

export function ButtonRowsEditor({ message, messages, onChange }: { message: BotTemplate; messages: BotTemplate[]; onChange: (rows: BotButton[][]) => void }) {
 const rows = message.rows;
 const update = (r:number,b:number,patch:Partial<BotButton>) => onChange(rows.map((row,index) => index===r ? row.map((button,i) => i===b ? {...button,...patch} : button) : row));
 const newButton = (): BotButton => ({text:'ورود به فروشگاه',action:'miniapp',value:'/',style:''});
 const count=rows.reduce((total,row)=>total+row.length,0);
 const selectAction = (r:number,b:number,action:ButtonAction) => update(r,b,{action,value:action==='miniapp'?'/':action==='url'?'https://':action==='message'?messages.find(m=>m.key.startsWith('custom.'))?.key||'':''});
 return <section className="bot-button-editor">
  <div className="bot-section-title"><h3>دکمه‌های زیر پیام</h3><button type="button" disabled={rows.length>=10||count>=40} onClick={()=>onChange([...rows,[newButton()]])}><Plus size={15}/>ردیف جدید</button></div>
  <p className="bot-hint">هر ردیف ۱ تا ۸ دکمه؛ جای دکمه‌ها و ردیف‌ها را با فلش‌ها تغییر دهید. حداکثر ۴۰ دکمه. پیش‌نمایش به ترتیب چپ به راست تلگرام است.</p>
  {rows.length===0&&<div className="bot-empty">این پیام دکمه‌ای ندارد.</div>}
  {rows.map((row,r)=><section className="bot-button-row" key={r}>
   <header><strong>ردیف {(r+1).toLocaleString('fa-IR')} · {row.length.toLocaleString('fa-IR')} دکمه</strong><div>
    <button type="button" aria-label={'انتقال ردیف '+(r+1)+' به بالا'} disabled={r===0} onClick={()=>onChange(move(rows,r,r-1))}><ArrowUp size={16}/></button>
    <button type="button" aria-label={'انتقال ردیف '+(r+1)+' به پایین'} disabled={r===rows.length-1} onClick={()=>onChange(move(rows,r,r+1))}><ArrowDown size={16}/></button>
    <button type="button" aria-label={'حذف ردیف '+(r+1)} onClick={()=>onChange(rows.filter((_,i)=>i!==r))}><Trash2 size={16}/></button>
   </div></header>
   {row.map((button,b)=><div className="bot-button-fields" key={b}>
    <div className="bot-button-order"><span>دکمه {(b+1).toLocaleString('fa-IR')}</span><div dir="ltr">
     <button type="button" aria-label="انتقال دکمه به چپ" disabled={b===0} onClick={()=>onChange(rows.map((item,i)=>i===r?move(item,b,b-1):item))}><ArrowLeft size={15}/></button>
     <button type="button" aria-label="انتقال دکمه به راست" disabled={b===row.length-1} onClick={()=>onChange(rows.map((item,i)=>i===r?move(item,b,b+1):item))}><ArrowRight size={15}/></button>
     <button type="button" aria-label="حذف دکمه" onClick={()=>onChange(rows.map((item,i)=>i===r?item.filter((_,j)=>j!==b):item).filter(item=>item.length))}><Trash2 size={15}/></button>
    </div></div>
    <div className="bot-fields"><label>متن دکمه<input value={button.text} maxLength={64} onChange={e=>update(r,b,{text:e.target.value})}/></label>
    <label>عملکرد<select value={button.action} onChange={e=>selectAction(r,b,e.target.value as ButtonAction)}>{Object.entries(actionLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
    <label>رنگ<select value={button.style} onChange={e=>update(r,b,{style:e.target.value as BotButton['style']})}>{styleOptions.map(style=><option key={style.value} value={style.value}>{style.label}</option>)}</select></label>
    {button.action==='message'?<label>پیام مقصد<select value={button.value} onChange={e=>update(r,b,{value:e.target.value})}><option value="">انتخاب پیام…</option>{messages.filter(m=>m.key.startsWith('custom.')).map(m=><option key={m.key} value={m.key}>{m.name}{!m.enabled?' (خاموش)':''}</option>)}</select></label>
    :button.action!=='verify'&&<label>{button.action==='url'?'لینک کامل':button.action==='copy'?'متن برای کپی':'مسیر مینی‌اپ'}<input dir={button.action==='copy'?'auto':'ltr'} maxLength={button.action==='copy'?256:2048} placeholder={button.action==='miniapp'?'/wallet':button.action==='url'?'https://example.com':''} value={button.value} onChange={e=>update(r,b,{value:e.target.value})}/></label>}
    </div>
   </div>)}
   <button type="button" className="bot-add-button" disabled={row.length>=8||count>=40} onClick={()=>onChange(rows.map((item,i)=>i===r?[...item,newButton()]:item))}><Plus size={15}/>افزودن دکمه به همین ردیف</button>
  </section>)}
 </section>;
}
