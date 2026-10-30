export type ButtonStyle = '' | 'primary' | 'success' | 'danger';
export type ButtonAction = 'url' | 'miniapp' | 'message' | 'copy' | 'verify';
export interface BotButton { text: string; action: ButtonAction; value: string; style: ButtonStyle }
export interface BotTemplate { key: string; name: string; text: string; format: 'plain' | 'HTML'; enabled: boolean; rows: BotButton[][]; contact_label: string; contact_style: ButtonStyle }
export interface Definition { key: string; name: string; group: string; kind: 'message' | 'contact' | 'alert' | 'invoice'; limit: number; variables: string[]; default: BotTemplate }
export interface BotConfig { revision: number; messages: BotTemplate[] }
export interface BotView extends BotConfig { definitions: Definition[] }
export const styleOptions: { value: ButtonStyle; label: string }[] = [{value:'',label:'پیش‌فرض تلگرام'},{value:'primary',label:'آبی'},{value:'success',label:'سبز'},{value:'danger',label:'قرمز'}];
export const actionLabels: Record<ButtonAction,string> = { url:'باز کردن لینک',miniapp:'صفحه مینی‌اپ',message:'نمایش پیام سفارشی',copy:'کپی متن',verify:'درخواست شماره تلفن' };
export const identityVariables = ['first_name','last_name','user_name','username','telegram_id'];
export const customDefinition = (template: BotTemplate): Definition => ({key:template.key,name:template.name,group:'سفارشی',kind:'message',limit:4096,variables:identityVariables,default:template});
