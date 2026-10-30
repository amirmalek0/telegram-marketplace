import { RotateCcw } from 'lucide-react';
import { Toggle } from '@/components/ui';
import { ButtonRowsEditor } from './ButtonRowsEditor';
import { styleOptions, type BotTemplate, type Definition } from './types';

export function MessageEditor({message,definition,messages,onChange,onReset}:{message:BotTemplate;definition:Definition;messages:BotTemplate[];onChange:(message:BotTemplate)=>void;onReset?:()=>void}){
 const change=(patch:Partial<BotTemplate>)=>onChange({...message,...patch});
 const isTextOnly=['alert','invoice'].includes(definition.kind);
 return <div className="bot-message-editor">
  <div className="bot-section-title"><h2>{definition.name}</h2><div>
   {definition.kind==='message'&&<Toggle ariaLabel="ارسال این پیام" checked={message.enabled} onChange={enabled=>change({enabled})}/>}
   {onReset&&<button type="button" onClick={onReset}><RotateCcw size={15}/>پیش‌فرض</button>}
  </div></div>
  {message.key.startsWith('custom.')&&<label>نام پیام در پنل<input value={message.name} maxLength={100} onChange={e=>change({name:e.target.value})}/></label>}
  {!isTextOnly&&<label>قالب متن<select value={message.format} onChange={e=>change({format:e.target.value as BotTemplate['format']})}><option value="plain">متن ساده</option><option value="HTML">HTML تلگرام</option></select></label>}
  <label className="bot-text-label"><span>متن پیام <small dir="ltr">{message.text.length} / {definition.limit}</small></span>
   <textarea rows={8} dir="auto" maxLength={definition.limit} value={message.text} onChange={e=>change({text:e.target.value})}/>
  </label>
  {definition.variables.length>0&&<div className="bot-variables"><span>افزودن متغیر:</span>{definition.variables.map(variable=><button type="button" key={variable} onClick={()=>change({text:message.text+'{'+variable+'}'})} disabled={message.text.length+variable.length+2>definition.limit}><code>{'{'+variable+'}'}</code></button>)}</div>}
  {message.format==='HTML'&&<p className="bot-hint" dir="auto">b, strong, i, em, u, s, code, pre, blockquote, tg-spoiler و a href پشتیبانی می‌شوند. CSS و اسکریپت مجاز نیستند؛ نام و اطلاعات کاربران به‌صورت امن درج می‌شوند.</p>}
  {isTextOnly&&<p className="bot-hint">این متن داخل فاکتور یا پنجره پرداخت تلگرام است؛ تلگرام برای آن دکمه یا HTML سفارشی نمی‌پذیرد.</p>}
  {message.key.startsWith('custom.')&&<p className="bot-hint">این پیام با دکمه «نمایش پیام سفارشی» باز می‌شود. آن را به پیام شروع یا منوی دیگری وصل کنید؛ به‌صورت خودکار ارسال نمی‌شود.</p>}
  {message.key.startsWith('manual.')&&<p className="bot-hint">این متن فقط برای ربات است؛ متن اعلان داخل مینی‌اپ در تنظیمات کارت‌به‌کارت باقی می‌ماند. وضعیت واقعی پرداخت، هشدار آزمایشی و دلیل رد محفوظ هستند.</p>}
  {definition.kind==='contact'&&<section className="bot-contact"><h3>دکمه اشتراک‌گذاری شماره</h3><p className="bot-hint">این دکمه باید کیبورد پاسخ تلگرام باشد؛ نمی‌توان آن را با دکمه‌های شیشه‌ای زیر پیام ترکیب کرد. اشتراک شماره همچنان تنها با تأیید خود کاربر انجام می‌شود.</p>
   <div className="bot-fields"><label>عنوان دکمه<input value={message.contact_label} maxLength={64} onChange={e=>change({contact_label:e.target.value})}/></label>
   <label>رنگ<select value={message.contact_style} onChange={e=>change({contact_style:e.target.value as BotTemplate['contact_style']})}>{styleOptions.map(style=><option key={style.value} value={style.value}>{style.label}</option>)}</select></label></div>
  </section>}
  {definition.kind==='message'&&<ButtonRowsEditor message={message} messages={messages} onChange={rows=>change({rows})}/>}
 </div>;
}
