import type { Palette, PaletteColors } from './palette';

export interface ThemePreset {
  id: string;
  name: string;
  collection: string;
  accent: string;
  palette: Palette;
}

// Thirty curated accent pairs × five complete surface palettes. Each preset includes
// both modes; these are ordinary palettes, not a new runtime theme configuration.
const accents = [
  { id: 'ocean', name: 'اقیانوس', light: '#1d4ed8', dark: '#7db4ff', ink: '#172554' },
  { id: 'iris', name: 'زنبق', light: '#6d28d9', dark: '#bd9bff', ink: '#3b1764' },
  { id: 'emerald', name: 'زمرد', light: '#047857', dark: '#63dab1', ink: '#064e3b' },
  { id: 'lagoon', name: 'تالاب', light: '#0e7490', dark: '#67d5e8', ink: '#164e63' },
  { id: 'rose', name: 'رز', light: '#be185d', dark: '#ffa1c4', ink: '#651b3d' },
  { id: 'amber', name: 'کهربا', light: '#92400e', dark: '#f9c563', ink: '#593719' },
  { id: 'coral', name: 'مرجان', light: '#c2410c', dark: '#ffad83', ink: '#682f21' },
  { id: 'olive', name: 'زیتون', light: '#446d0d', dark: '#bfdb7c', ink: '#34451c' },
  { id: 'ruby', name: 'یاقوت', light: '#b91c1c', dark: '#ff9d9d', ink: '#641f2a' },
  { id: 'graphite', name: 'گرافیت', light: '#475569', dark: '#c1cedf', ink: '#263244' },
  { id: 'cobalt', name: 'کبالت', light: '#1939b7', dark: '#9aabff', ink: '#19265e' },
  { id: 'indigo', name: 'نیلی', light: '#4338a3', dark: '#b6b0ff', ink: '#272259' },
  { id: 'violet', name: 'بنفش', light: '#7021a1', dark: '#d4a5ff', ink: '#421957' },
  { id: 'plum', name: 'آلو', light: '#86198f', dark: '#edabf4', ink: '#501653' },
  { id: 'magenta', name: 'ارغوانی', light: '#a21b70', dark: '#f6a4d6', ink: '#581c43' },
  { id: 'berry', name: 'تمشک', light: '#9d174d', dark: '#fda4af', ink: '#511d34' },
  { id: 'wine', name: 'زرشکی', light: '#881337', dark: '#f6a5bb', ink: '#4c1728' },
  { id: 'brick', name: 'آجری', light: '#9a3412', dark: '#fdb598', ink: '#51291e' },
  { id: 'copper', name: 'مسی', light: '#914b24', dark: '#e9b99a', ink: '#4a2d22' },
  { id: 'ochre', name: 'اخرایی', light: '#785711', dark: '#e8ce86', ink: '#42351c' },
  { id: 'moss', name: 'خزه', light: '#52631c', dark: '#c8d78f', ink: '#303a1e' },
  { id: 'forest', name: 'جنگلی', light: '#166534', dark: '#91dcaa', ink: '#173e27' },
  { id: 'jade', name: 'یشمی', light: '#116650', dark: '#8bdfc3', ink: '#183e34' },
  { id: 'teal', name: 'سبزآبی', light: '#0f6669', dark: '#85dcda', ink: '#183e40' },
  { id: 'petrol', name: 'نفتی', light: '#155e75', dark: '#95d6ed', ink: '#1b3746' },
  { id: 'azure', name: 'لاجوردی', light: '#075985', dark: '#90cefa', ink: '#19374e' },
  { id: 'denim', name: 'جین', light: '#315b91', dark: '#adc9ee', ink: '#223752' },
  { id: 'steel', name: 'فولادی', light: '#4a6076', dark: '#bccddd', ink: '#2b3744' },
  { id: 'espresso', name: 'قهوه‌ای', light: '#62463a', dark: '#dec0b0', ink: '#352a25' },
  { id: 'charcoal', name: 'زغالی', light: '#404044', dark: '#d1d1d7', ink: '#27272c' },
] as const;

type SurfaceColors = Pick<PaletteColors, 'background' | 'surface' | 'text' | 'secondary'>;
const collections: { id: string; name: string; light: SurfaceColors; dark: SurfaceColors }[] = [
  { id: 'porcelain', name: 'چینی',
    light: { background: '#f5f5f7', surface: '#ffffff', text: '#17171c', secondary: '#5d5d68' },
    dark: { background: '#101014', surface: '#1d1d24', text: '#f5f5fa', secondary: '#b6b6c5' } },
  { id: 'linen', name: 'کتان',
    light: { background: '#f7f3ec', surface: '#fffdf8', text: '#29241e', secondary: '#6c6052' },
    dark: { background: '#191612', surface: '#28231d', text: '#faf3e7', secondary: '#c5b8a5' } },
  { id: 'mist', name: 'مه',
    light: { background: '#eef3f8', surface: '#fafdff', text: '#182838', secondary: '#52677a' },
    dark: { background: '#0e1926', surface: '#1b2a3b', text: '#edf5ff', secondary: '#acbfd4' } },
  { id: 'petal', name: 'گلبرگ',
    light: { background: '#f8f0f3', surface: '#fffbfd', text: '#30212b', secondary: '#745867' },
    dark: { background: '#1c141c', surface: '#2b202b', text: '#fbf0f8', secondary: '#c9b2c3' } },
  { id: 'sage', name: 'مریم‌گلی',
    light: { background: '#eff4f0', surface: '#fbfefb', text: '#203029', secondary: '#52685b' },
    dark: { background: '#111c17', surface: '#203027', text: '#eff8f1', secondary: '#b2c9b9' } },
];

export const themeCollections = collections.map(({ id, light, dark }) => ({ id, light, dark }));
export const themeAccents = accents.map(({ id, light, dark }) => ({ id, light, dark }));
export const themePresets: ThemePreset[] = collections.flatMap(collection => accents.map(accent => ({
  id: `${collection.id}-${accent.id}`,
  name: `${accent.name} · ${collection.name}`,
  collection: collection.id,
  accent: accent.id,
  palette: {
    light: { ...collection.light, accent: accent.light, navigation: accent.ink },
    dark: { ...collection.dark, accent: accent.dark, navigation: accent.dark },
  },
})));

export function matchingPreset(palette: Palette): ThemePreset | undefined {
  return themePresets.find(preset => (['light', 'dark'] as const).every(mode =>
    (Object.keys(preset.palette[mode]) as (keyof PaletteColors)[]).every(key =>
      preset.palette[mode][key].toLowerCase() === palette[mode][key].toLowerCase())));
}
