import { createElement, type ReactNode } from 'react';
import { Bot, ExternalLink } from 'lucide-react';
import type { BotTemplate, Definition } from './types';
import { previewText } from './helpers';

// Only render supported tags; preview links are inert and attributes are discarded.
function formatted(text:string):ReactNode {
 const document = new DOMParser().parseFromString('<root>'+text+'</root>','application/xml');
 if(document.querySelector('parsererror'))return text;
 const render=(node:Node,key:number):ReactNode=>{
  if(node.nodeType===Node.TEXT_NODE)return node.textContent;
  if(node.nodeType!==Node.ELEMENT_NODE)return null;
  const el=node as Element; const tag=el.tagName.toLowerCase();
  const children=Array.from(node.childNodes).map(render);
  if(!['b','strong','i','em','u','s','code','pre','blockquote','tg-spoiler','a'].includes(tag))return children;
  return createElement(tag==='a'||tag==='tg-spoiler'?'span':tag,{key,className:tag==='a'?'bot-preview-link':tag==='tg-spoiler'?'bot-preview-spoiler':undefined},children);
 };
 return Array.from(document.documentElement.childNodes).map(render);
}
export function MessagePreview({message,definition}:{message:BotTemplate;definition:Definition}){
 const text=previewText(message);
 return <aside className="bot-preview"><div className="bot-preview-title"><Bot size={20}/><strong>پیش‌نمایش پیام</strong><small>اطلاعات نمونه</small></div>
  <div className={'bot-chat '+(!message.enabled?'is-disabled':'')}>
   <div className="bot-chat-message">{message.format==='HTML'?formatted(text):text}
    {message.key.startsWith('manual.')&&<small className="bot-safety-note">{message.key.endsWith('approved')?'پرداخت کارت‌به‌کارت تأیید شد':'پرداخت کارت‌به‌کارت رد شد'}<br/>در پرداخت آزمایشی، هشدار آزمایشی بودن نیز اضافه می‌شود.</small>}
    <time>۱۲:۳۰ ✓✓</time>
   </div>
   {definition.kind==='contact'?<div className="bot-chat-row"><span className={'bot-chat-button style-'+message.contact_style}>{message.contact_label}</span></div>:message.rows.map((row,i)=><div className="bot-chat-row" key={i}>{row.map((b,j)=><span className={'bot-chat-button style-'+b.style} key={j}>{b.text}{['url','miniapp'].includes(b.action)&&<ExternalLink size={11}/>}</span>)}</div>)}
  </div>
  {!message.enabled&&<p className="bot-hint">ارسال این پیام خاموش است.</p>}
  <p className="bot-hint">این فقط پیش‌نمایش است؛ پیامی ارسال نمی‌شود. رنگ، شفافیت، اندازه و شکست متن را برنامه تلگرام تعیین می‌کند. HTML محدود به قالب‌بندی امن است.</p>
 </aside>;
}
