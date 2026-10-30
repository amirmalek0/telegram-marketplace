import type { BotTemplate } from './types.ts';

export function removeCustomMessage(messages: BotTemplate[], key: string): BotTemplate[] {
 if (!key.startsWith('custom.')) return messages;
 return messages.filter(message => message.key !== key).map(message => ({
  ...message, rows: message.rows.map(row => row.filter(button => button.action !== 'message' || button.value !== key)).filter(row => row.length),
 }));
}
export function referringMessages(messages: BotTemplate[], key: string): BotTemplate[] {
 return messages.filter(message => message.key !== key && message.rows.some(row => row.some(button => button.action === 'message' && button.value === key)));
}
export function move<T>(values: T[], from: number, to: number): T[] {
 if (to < 0 || to >= values.length || from < 0 || from >= values.length) return values;
 const next = [...values]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next;
}
export const samples: Record<string,string> = {
 first_name:'سارا',last_name:'احمدی',user_name:'سارا احمدی',username:'sara',telegram_id:'123456789',
 amount:'10',inviter_name:'امیر',invitee_name:'سارا',title:'محصول انتخابی',description:'خرید محصول انتخابی',amount_toman:'125000',
 payment_id:'12345678-abcd-4000-8000-123456789012',reason:'مبلغ واریزی مطابقت ندارد',result:'جزئیات خرید را در مینی‌اپ مشاهده کنید.',
 status:'وضعیت پرداخت',test_notice:'',action_path:'/orders',
};
export function previewText(template: BotTemplate): string {
 return template.text.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
  const value = samples[key] ?? '{'+key+'}';
  return template.format === 'HTML' ? value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : value;
 });
}
