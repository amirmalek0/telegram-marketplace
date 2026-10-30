import { catalogIconNames } from './iconCatalog.ts';
import { navigationIcons, navigationIconLabels, type NavigationIcon } from './navigationSettings.ts';

// Persian aliases cover common subjects; exact Lucide names remain searchable too.
const subjects: [RegExp, string][] = [
  [/user|contact|person|smile|accessibility/, 'کاربر پروفایل شخص حساب مخاطب'],
  [/shopping|store|basket|cart|bag/, 'فروشگاه خرید سبد کیف'],
  [/wallet|coin|bank|credit|dollar|receipt|currency|money/, 'پول مالی کیف پول پرداخت سفارش رسید بانک'],
  [/message|mail|ticket|headset|phone/, 'پیام گفتگو تیکت پشتیبانی تلفن تماس'],
  [/bell|alarm/, 'اعلان زنگ هشدار'], [/star|sparkle|crown|gem/, 'ستاره ویژه تاج درخشش VIP'],
  [/file|folder|archive|download|upload/, 'فایل پوشه دانلود آپلود سند'],
  [/image|camera|video|film/, 'تصویر عکس دوربین فیلم ویدیو'],
  [/music|audio|volume|headphone|mic/, 'صدا موسیقی میکروفون هدفون'],
  [/arrow|chevron|move|undo|redo/, 'فلش جهت بازگشت حرکت'],
  [/search|scan|eye/, 'جستجو جست‌وجو مشاهده چشم'],
  [/home|house|building|landmark/, 'خانه ساختمان صفحه اصلی'],
  [/heart|hand|gift/, 'قلب علاقه هدیه دست'],
  [/settings|wrench|sliders|cog/, 'تنظیمات ابزار'],
  [/lock|key|shield|fingerprint/, 'امنیت قفل کلید محافظ'],
  [/calendar|clock|timer|watch|hourglass/, 'زمان ساعت تقویم تاریخ'],
  [/sun|moon|cloud|snow|rain|wind/, 'خورشید ماه ابر آب هوا روشن تیره'],
  [/map|pin|compass|globe|navigation/, 'نقشه مکان موقعیت مسیر جهان'],
  [/book|graduation|school|library/, 'کتاب مدرسه آموزش کتابخانه'],
  [/chart|trending|activity/, 'نمودار آمار گزارش'],
  [/check|circle-check|badge-check/, 'تایید تأیید موفق تیک'],
  [/circle-x|ban|octagon|triangle-alert/, 'خطا لغو هشدار حذف'],
  [/code|terminal|database|server|cpu/, 'کد برنامه پایگاه داده سرور'],
  [/text|type|heading|pilcrow|align/, 'متن عنوان نوشتن تراز'],
  [/layout|panel|grid|list|menu/, 'چیدمان شبکه فهرست منو'],
];
export const legacyIconTargets: Record<string, string> = {
  shop:'shopping-bag', wallet:'wallet', crown:'crown', tickets:'messages-square', profile:'user-round', orders:'receipt-text',
  download:'download', bell:'bell', star:'star', gift:'gift', box:'box', file:'file', search:'search', sparkles:'sparkles',
  phone:'smartphone', info:'info', eye:'eye', clock:'clock', check:'circle-check', sun:'sun', moon:'moon',
};
export function iconLabel(icon: NavigationIcon) { return navigationIconLabels[icon] ?? icon.slice(7).replace(/-/g, ' '); }
const normalize = (text: string) => text.toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\s\u200c-]+/g,' ').trim();
export const pickerIcons: NavigationIcon[] = [...navigationIcons, ...catalogIconNames.map(name => `lucide:${name}` as const)];
const searchable = pickerIcons.map(id => {
  const name = legacyIconTargets[id] ?? id.slice(7);
  return { id, text:normalize(iconLabel(id)+' '+name+' '+subjects.filter(([pattern])=>pattern.test(name)).map(([,terms])=>terms).join(' ')) };
});
export function searchPickerIcons(query: string): NavigationIcon[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  return searchable.filter(entry=>terms.every(term=>entry.text.includes(term))).map(entry=>entry.id);
}
