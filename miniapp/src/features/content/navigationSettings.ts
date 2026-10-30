import { navigationPositions, navigationGeometries } from './chromePositioning.ts';
// Shared contract for bottom navigation. Routes are allowlisted, never admin URLs.
import { isCatalogIcon, type CatalogIconName } from './iconCatalog.ts';
import { navigationLayoutPresetIds, navigationLayoutPresets } from './chromeLayoutPresets.ts';
export const navigationKey = 'appearance.navigation';
export const navigationThemes = ['classic','glass','pill','underline','outline','solid','soft','segmented','floating','dock','gradient','minimal', 'aurora', 'frost', 'mesh', 'halo', 'neon', 'duotone', 'tinted', 'contrast', 'editorial', 'rail', 'frame', 'notebook', 'capsule', 'island', 'bevel', 'inset', 'brutalist', 'dashed', ...navigationLayoutPresetIds] as const;
export const navigationThemeLabels: Record<string,string> = { aurora:'شفق', frost:'شیشه مات', mesh:'نور پراکنده', halo:'هاله', neon:'نئون', duotone:'دو رنگ', tinted:'رنگ‌مایه', contrast:'کنتراست', editorial:'تحریریه', rail:'ریل', frame:'قاب دوگانه', notebook:'دفتر', capsule:'کپسول مجزا', island:'جزیره', bevel:'برجسته', inset:'فرورفته', brutalist:'خط جسور', dashed:'خط‌چین', classic:'کلاسیک',glass:'شیشه‌ای',pill:'کپسولی',underline:'خط تأکیدی',outline:'قاب خطی',solid:'یکپارچه',soft:'ملایم',segmented:'بخش‌بندی',floating:'شناور',dock:'داک',gradient:'گرادیان',minimal:'مینیمال' };
export const navigationRoutes = { shop:'/',wallet:'/wallet',vip:'/vip',tickets:'/tickets',profile:'/profile',orders:'/orders',downloads:'/downloads',notifications:'/notifications' } as const;
Object.assign(navigationThemeLabels, Object.fromEntries(Object.entries(navigationLayoutPresets).map(([id,preset]) => [id,preset.label])));
export type NavigationPage = keyof typeof navigationRoutes;
export const navigationLabels: Record<NavigationPage,string> = { shop:'فروشگاه',wallet:'کیف پول',vip:'VIP',tickets:'تیکت‌ها',profile:'پروفایل',orders:'سفارش‌ها',downloads:'دانلودها',notifications:'اعلان‌ها' };
export const navigationIcons = ['shop','wallet','crown','tickets','profile','orders','download','bell','star','gift','box','file','search','sparkles','phone','info','eye','clock','check','sun','moon'] as const;
export type NavigationIcon = typeof navigationIcons[number] | CatalogIconName;
export const navigationIconLabels: Record<string,string> = { shop:'فروشگاه',wallet:'کیف پول',crown:'تاج',tickets:'گفت‌وگو',profile:'کاربر',orders:'رسید',download:'دانلود',bell:'زنگ',star:'ستاره',gift:'هدیه',box:'جعبه',file:'فایل',search:'جست‌وجو',sparkles:'درخشش',phone:'موبایل',info:'اطلاعات',eye:'چشم',clock:'ساعت',check:'تأیید',sun:'خورشید',moon:'ماه' };
export function isNavigationIcon(value: unknown): value is NavigationIcon { return isCatalogIcon(value) || (navigationIcons as readonly unknown[]).includes(value); }
export const navigationColorKeys = ['background','border','text','activeBackground','activeText'] as const;
export const navigationColorLabels: Record<string,string> = { background:'پس‌زمینه نوار',border:'رنگ کادر',text:'متن و آیکون',activeBackground:'پس‌زمینه فعال',activeText:'متن و آیکون فعال' };
export interface NavigationItem { page: NavigationPage; visible: boolean; label: string; icon: NavigationIcon; color: string; activeColor: string }
export interface NavigationSettings {
  positioning?:string; geometry?:typeof navigationGeometries[number];
  version:1; theme:typeof navigationThemes[number]; items:NavigationItem[]; labels:boolean; autoCompact:boolean;
  colors:Record<'light'|'dark',Record<typeof navigationColorKeys[number],string>>;
  iconSize:number; labelSize:number; height:number; borderRadius:number; itemRadius:number;
}
const emptyColors = () => ({ background:'',border:'',text:'',activeBackground:'',activeText:'' });
const defaultIcons: Record<NavigationPage,NavigationIcon> = { shop:'shop',wallet:'wallet',vip:'crown',tickets:'tickets',profile:'profile',orders:'orders',downloads:'download',notifications:'bell' };
export const defaultNavigation: NavigationSettings = {
  version:1,theme:'classic',labels:true,autoCompact:true,iconSize:21,labelSize:11,height:66,borderRadius:22,itemRadius:16,
  colors:{ light:emptyColors(),dark:emptyColors() },
  items:(Object.keys(navigationRoutes) as NavigationPage[]).map((page,index) => ({ page,visible:index<5,label:navigationLabels[page],icon:defaultIcons[page],color:'',activeColor:'' })),
};
const color = (value:unknown) => typeof value==='string' && (value==='' || /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$/.test(value));
export function parseNavigationSettings(value:unknown):NavigationSettings|null {
  try {
    const data=typeof value==='string'?JSON.parse(value):value;
    if (!data || typeof data!=='object' || (Object.keys(data).length<11 || Object.keys(data).length>13) || Object.keys(data).some(key=>!['version','theme','items','labels','autoCompact','colors','iconSize','labelSize','height','borderRadius','itemRadius','positioning','geometry'].includes(key)) || ('positioning' in data && !navigationPositions.some(item=>item.id===data.positioning)) || ('geometry' in data && !navigationGeometries.includes(data.geometry)) || data.version!==1 || !navigationThemes.includes(data.theme) || typeof data.labels!=='boolean' || typeof data.autoCompact!=='boolean') return null;
    for (const [key,min,max] of [['iconSize',16,32],['labelSize',10,16],['height',56,92],['borderRadius',0,40],['itemRadius',0,32]] as const) if (typeof data[key]!=='number' || !Number.isFinite(data[key]) || data[key]<min || data[key]>max) return null;
    if (!data.colors || Object.keys(data.colors).length!==2 || !['light','dark'].every(mode => data.colors[mode] && Object.keys(data.colors[mode]).length===5 && navigationColorKeys.every(key=>color(data.colors[mode][key])))) return null;
    if (!Array.isArray(data.items) || data.items.length!==8 || new Set(data.items.map((item:NavigationItem)=>item?.page)).size!==8) return null;
    if (!data.items.every((item:NavigationItem)=>item && Object.keys(item).length===6 && Object.prototype.hasOwnProperty.call(navigationRoutes,item.page) && typeof item.visible==='boolean' && typeof item.label==='string' && item.label.trim() && [...item.label].length<=24 && isNavigationIcon(item.icon) && color(item.color) && color(item.activeColor))) return null;
    const visible=data.items.filter((item:NavigationItem)=>item.visible).length;
    if (visible<1 || visible>6) return null;
    return structuredClone(data);
  } catch { return null; }
}
