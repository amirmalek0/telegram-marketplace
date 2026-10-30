import { useEffect, useState } from 'react';
import { Bot, Plus, Save, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button, Modal } from '@/components/ui';
import { MessageEditor } from './MessageEditor';
import { MessagePreview } from './MessagePreview';
import { customDefinition, type BotConfig, type BotTemplate, type BotView } from './types';
import { referringMessages, removeCustomMessage } from './helpers';
import './bot-messages.css';

export default function BotMessagesPage(){
 const [view,setView]=useState<BotView|null>(null),[draft,setDraft]=useState<BotConfig|null>(null),[selected,setSelected]=useState('start');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[confirm,setConfirm]=useState<'delete'|'reset'|'discard'|null>(null);
 const dirty=Boolean(draft&&view&&JSON.stringify(draft.messages)!==JSON.stringify(view.messages));
 const load=async()=>{
  setBusy(true);setError('');
  try{const {data}=await apiClient.get<BotView>('/settings/bot-messages');setView(data);setDraft({revision:data.revision,messages:structuredClone(data.messages)});}
  catch{setError('دریافت پیام‌ها ناموفق بود.');}finally{setBusy(false);}
 };
 useEffect(()=>{void load();},[]);
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty]);
 const save=async()=>{
  if(!draft||busy)return;setBusy(true);setError('');
  try{const {data}=await apiClient.put<BotView>('/settings/bot-messages',draft);setView(data);setDraft({revision:data.revision,messages:structuredClone(data.messages)});toast.success('پیام‌های ربات ذخیره شدند');}
  catch(reason:any){setError(reason.response?.data?.error||'ذخیره پیام‌ها ناموفق بود.');}finally{setBusy(false);}
 };
 const change=(message:BotTemplate)=>setDraft(current=>current?{...current,messages:current.messages.map(m=>m.key===message.key?message:m)}:null);
 const add=()=>{
  const message:BotTemplate={key:'custom.'+crypto.randomUUID(),name:'پیام سفارشی جدید',text:'متن پیام را بنویسید.',enabled:true,format:'plain',rows:[],contact_label:'',contact_style:''};
  setDraft(current=>current?{...current,messages:[...current.messages,message]}:null);setSelected(message.key);setQuery('');
 };
 const message=draft?.messages.find(m=>m.key===selected);
 const definition=message&&(view?.definitions.find(d=>d.key===selected)||customDefinition(message));
 const references=draft?referringMessages(draft.messages,selected):[];
 return <div className="bot-messages-page">
  <div className="page-heading"><div className="flex items-center gap-3"><Bot size={26}/><h1>پیام‌های ربات</h1></div><div className="flex flex-wrap items-center gap-2">
   <Button size="sm" variant="secondary" disabled={!dirty||busy} onClick={()=>setConfirm('discard')}>لغو تغییرات</Button>
   <Button size="sm" icon={<Save size={16}/>} disabled={!dirty||busy} loading={busy} onClick={()=>void save()}>ذخیره پیام‌ها</Button>
  </div></div>
  <details className="bot-guide surface-card"><summary>راهنما و محدودیت‌های تلگرام</summary><p>همه پیام‌های فعلی ربات، خطاهای پرداخت و متن فاکتورها در این صفحه هستند. متن، قالب، متغیرها و دکمه‌ها را تغییر دهید؛ پیش‌نمایش زنده است ولی تغییرات فقط با ذخیره منتشر می‌شوند و پیام‌های قبلی تلگرام ویرایش نمی‌شوند.</p><p>دکمه‌ها می‌توانند لینک، مسیر مینی‌اپ، متن قابل کپی، پیام سفارشی یا درخواست شماره باشند. برای مینی‌اپ از مسیرهایی مانند /wallet، /vip و /tickets استفاده کنید؛ آدرس اصلی از منوی ربات دریافت می‌شود. در پیام نتیجه پرداخت، مسیر {'{action_path}'} صفحه خرید مربوطه را باز می‌کند.</p><p>رنگ‌ها به پیش‌فرض، آبی، سبز و قرمز محدودند؛ ظاهر شیشه‌ای و اندازه را تلگرام تعیین می‌کند. شماره‌گیری، خرید یا تأیید پرداخت با دکمه سفارشی انجام نمی‌شود.</p><p>اعلان‌های همگانی و تیکت‌ها در نسخه فعلی داخل مینی‌اپ هستند و با ساخت قالب جدید به پیام تلگرام تبدیل نمی‌شوند. پیام تحویل محصول نیز از بخش کاتالوگ مدیریت می‌شود.</p></details>
  {error&&<div className="bot-error" role="alert">{error}<button type="button" disabled={busy} onClick={()=>dirty?setConfirm('discard'):void load()}>دریافت دوباره</button></div>}
  {!view||!draft?<p role="status">{busy?'در حال دریافت…':'اطلاعات پیام‌ها در دسترس نیست.'}</p>:<fieldset disabled={busy} className="bot-workspace">
   <aside className="bot-message-list surface-card">
    <label className="bot-search"><Search size={16}/><input aria-label="جست‌وجوی پیام" placeholder="جست‌وجوی پیام…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <button type="button" className="bot-new-message" disabled={draft.messages.length>=67} onClick={add}><Plus size={16}/>پیام سفارشی جدید</button>
    {[...new Set(draft.messages.map(m=>view.definitions.find(d=>d.key===m.key)?.group||'سفارشی'))].map(group=>{
     const messages=draft.messages.filter(m=>(view.definitions.find(d=>d.key===m.key)?.group||'سفارشی')===group&&(m.name+' '+m.key).toLowerCase().includes(query.toLowerCase()));
     return messages.length>0&&<section key={group}><h3>{group}</h3>{messages.map(m=><button type="button" className={m.key===selected?'is-selected':''} aria-pressed={m.key===selected} key={m.key} onClick={()=>setSelected(m.key)}><span>{m.name}</span><i className={m.enabled?'is-on':''}/></button>)}</section>;
    })}
   </aside>
   {message&&definition&&<><section className="surface-card bot-editor-surface">
    <MessageEditor message={message} definition={definition} messages={draft.messages} onChange={change} onReset={!selected.startsWith('custom.')?()=>setConfirm('reset'):undefined}/>
    {selected.startsWith('custom.')&&<button type="button" className="bot-delete-message" onClick={()=>setConfirm('delete')}><Trash2 size={15}/>حذف پیام سفارشی</button>}
   </section><MessagePreview message={message} definition={definition}/></>}
  </fieldset>}
  <Modal isOpen={Boolean(confirm)} onClose={()=>setConfirm(null)} title={confirm==='delete'?'حذف پیام سفارشی':confirm==='reset'?'بازنشانی پیام':'لغو تغییرات ذخیره‌نشده'} size="sm" footer={<><Button variant="secondary" onClick={()=>setConfirm(null)}>انصراف</Button><Button onClick={()=>{
   if(confirm==='delete'&&draft){setDraft({...draft,messages:removeCustomMessage(draft.messages,selected)});setSelected('start');}
   if(confirm==='reset'&&definition)change(structuredClone(definition.default));
   if(confirm==='discard')void load();
   setConfirm(null);
  }}>تأیید</Button></>}>
   {confirm==='delete'?<><p>این پیام و دکمه‌های متصل به آن از پیام‌های زیر حذف می‌شوند. حذف نهایی با «ذخیره پیام‌ها» انجام می‌شود.</p><ul>{references.map(m=><li key={m.key}>{m.name}</li>)}</ul>{references.length===0&&<p>هیچ پیام دیگری به آن متصل نیست.</p>}</>:<p>{confirm==='reset'?'متن و دکمه‌های این پیام به پیش‌فرض برمی‌گردند. پس از بررسی، ذخیره کنید.':'تمام تغییرات ذخیره‌نشده کنار گذاشته و آخرین تنظیمات دریافت می‌شوند.'}</p>}
  </Modal>
 </div>;
}
