import { headerPositions, headerGeometries } from './chromePositioning.ts';
// Shared persistence contract for the global Mini App header.
import { isNavigationIcon, type NavigationIcon } from './navigationSettings.ts';
import { headerLayoutPresetIds, headerLayoutPresets } from './chromeLayoutPresets.ts';
export const headerIconKeys = ['title', 'themeLight', 'themeDark', 'notifications', 'search', 'back'] as const;
export type HeaderIconKey = typeof headerIconKeys[number];
export const defaultHeaderIcons: Record<HeaderIconKey,NavigationIcon> = { title:'shop', themeLight:'moon', themeDark:'sun', notifications:'bell', search:'search', back:'lucide:chevron-left' };
export const headerIconLabels: Record<HeaderIconKey,string> = { title:'آیکون کنار عنوان', themeLight:'تغییر پوسته در حالت روشن', themeDark:'تغییر پوسته در حالت تیره', notifications:'آیکون اعلان‌ها', search:'آیکون جست‌وجو', back:'آیکون بازگشت' };
export const headerKey = 'appearance.header';
export const headerThemes = ['classic', 'minimal', 'glass', 'solid', 'outline', 'pill', 'gradient', 'underline', 'elevated', 'soft', 'split', 'compact', 'aurora', 'frost', 'mesh', 'halo', 'neon', 'duotone', 'tinted', 'contrast', 'editorial', 'rail', 'frame', 'notebook', 'capsule', 'island', 'bevel', 'inset', 'brutalist', 'dashed', ...headerLayoutPresetIds] as const;
export const headerLayouts = ['preset', 'standard', 'reversed', 'stacked', 'centered'] as const;
export const headerActions = ['theme', 'notifications', 'search'] as const;
export type HeaderAction = typeof headerActions[number];
export interface HeaderSettings {
  version: 1;
  positioning?: string;
  geometry?: typeof headerGeometries[number];
  theme: typeof headerThemes[number];
  layout: typeof headerLayouts[number];
  sticky: boolean;
  searchScope: 'shop' | 'all';
  icons: Record<HeaderAction | 'title', boolean>;
  actionOrder: HeaderAction[];
  logo?: string;
  iconNames?: Partial<Record<HeaderIconKey,NavigationIcon>>;
}
export const headerThemeLabels: Record<string, string> = { aurora:'شفق', frost:'شیشه مات', mesh:'نور پراکنده', halo:'هاله', neon:'نئون', duotone:'دو رنگ', tinted:'رنگ‌مایه', contrast:'کنتراست', editorial:'تحریریه', rail:'ریل', frame:'قاب دوگانه', notebook:'دفتر', capsule:'کپسول مجزا', island:'جزیره', bevel:'برجسته', inset:'فرورفته', brutalist:'خط جسور', dashed:'خط‌چین', classic: 'کلاسیک', minimal: 'مینیمال', glass: 'شیشه‌ای', solid: 'یکپارچه', outline: 'قاب خطی', pill: 'کپسولی', gradient: 'گرادیان', underline: 'خط تأکیدی', elevated: 'شناور', soft: 'ملایم', split: 'دو‌بخشی', compact: 'فشرده' };
Object.assign(headerThemeLabels, Object.fromEntries(Object.entries(headerLayoutPresets).map(([id,preset]) => [id,preset.label])));
export const headerLayoutLabels: Record<string, string> = { preset: 'چیدمان خود طرح', standard: 'عنوان راست، ابزار چپ', reversed: 'عنوان چپ، ابزار راست', stacked: 'عنوان و ابزار در دو ردیف', centered: 'عنوان و ابزار وسط‌چین' };
export const headerActionLabels: Record<string, string> = { theme: 'روشن / تاریک', notifications: 'اعلان‌ها', search: 'جست‌وجو', title: 'آیکون عنوان' };
export const defaultHeader: HeaderSettings = { version: 1, theme: 'classic', layout: 'standard', sticky: true, searchScope: 'shop', icons: { theme: true, notifications: true, search: true, title: true }, actionOrder: ['theme', 'notifications', 'search'] };
export function parseHeaderSettings(value: unknown): HeaderSettings | null {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || typeof data !== 'object' || (Object.keys(data).length < 7 || Object.keys(data).length > 11) ||
      Object.keys(data).some(key => !['version', 'theme', 'layout', 'sticky', 'searchScope', 'icons', 'actionOrder', 'logo', 'iconNames', 'positioning', 'geometry'].includes(key)) ||
      ('positioning' in data && !headerPositions.some(item => item.id === data.positioning)) ||
      ('geometry' in data && !headerGeometries.includes(data.geometry)) ||
      ('iconNames' in data && (!data.iconNames || typeof data.iconNames !== 'object' || Array.isArray(data.iconNames) || Object.entries(data.iconNames).some(([key, icon]) => !(headerIconKeys as readonly string[]).includes(key) || !isNavigationIcon(icon)))) ||
      ('logo' in data && (typeof data.logo !== 'string' || (data.logo !== '' && !/^\/api\/v1\/miniapp-logo\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/.test(data.logo)))) || data.version !== 1 ||
      !headerThemes.includes(data.theme) || !headerLayouts.includes(data.layout) || typeof data.sticky !== 'boolean' ||
      !['shop', 'all'].includes(data.searchScope) || !data.icons || Object.keys(data.icons).length !== 4 ||
      ![...headerActions, 'title'].every(key => typeof data.icons[key] === 'boolean') ||
      !Array.isArray(data.actionOrder) || data.actionOrder.length !== 3 || new Set(data.actionOrder).size !== 3 ||
      !data.actionOrder.every((key: HeaderAction) => headerActions.includes(key))) return null;
    return structuredClone(data);
  } catch { return null; }
}
export const searchDesigns = ['rounded', 'glass', 'outline', 'soft', 'underline', 'spotlight'] as const;
export function visibleHeaderActions(settings: HeaderSettings, detail: boolean, shop: boolean): HeaderAction[] {
  if (detail) return [];
  return settings.actionOrder.filter(action => settings.icons[action] && (action !== 'search' || shop || settings.searchScope === 'all'));
}
export const searchDesignLabels: Record<string, string> = { rounded: 'گرد', glass: 'شیشه‌ای', outline: 'خطی', soft: 'ملایم', underline: 'زیرخط', spotlight: 'تأکیدی' };
