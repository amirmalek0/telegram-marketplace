import { headerLayoutFamilies, navigationLayoutFamilies, headerLayoutPresets, navigationLayoutPresets } from './chromeLayoutPresets.ts';

export const headerPositions = [
  {id:'standard',label:'عنوان راست، ابزار چپ'}, {id:'reversed',label:'عنوان چپ، ابزار راست'},
  {id:'stacked',label:'دو ردیف'}, {id:'centered',label:'وسط‌چین'}, ...headerLayoutFamilies,
];
export const navigationPositions = [{id:'standard',label:'ردیف استاندارد'}, ...navigationLayoutFamilies];
export const headerGeometries = ['default','tiles','pills','rules','circles','tags'] as const;
export const navigationGeometries = ['default','plate','ring','marker','lozenge','bracket'] as const;
export const geometryLabels: Record<string,string> = {default:'شکل خود تم',tiles:'کاشی',pills:'کپسول',rules:'خط زیرین',circles:'دایره',tags:'برچسب',plate:'صفحه',ring:'حلقه',marker:'نشانگر',lozenge:'لوزی',bracket:'براکت'};

// Compatibility is read-only: old combined presets are never rewritten on load.
export function resolveChrome(kind:'header'|'navigation', settings:{theme:string;layout?:string;positioning?:string;geometry?:string}) {
  const preset = (kind === 'header' ? headerLayoutPresets : navigationLayoutPresets)[settings.theme];
  return {
    theme: preset ? 'classic' : settings.theme,
    positioning: settings.positioning ?? (kind === 'header' && settings.layout !== 'preset' ? settings.layout ?? 'standard' : preset?.family ?? 'standard'),
    geometry: settings.geometry ?? preset?.variant ?? 'default',
  };
}

export function separateChrome<T extends {theme:string;layout?:string;positioning?:string;geometry?:string}>(kind:'header'|'navigation', settings:T):T {
  return {...settings,...resolveChrome(kind,settings)};
}
