export type PaletteMode = 'light' | 'dark';
export const colorFields = [
  { key: 'accent', label: 'رنگ اصلی' },
  { key: 'background', label: 'پس‌زمینه صفحه' },
  { key: 'surface', label: 'کارت‌ها و منوها' },
  { key: 'text', label: 'متن اصلی' },
  { key: 'secondary', label: 'متن فرعی' },
  { key: 'navigation', label: 'گزینه فعال نوار پایین' },
] as const;
export type PaletteColors = Record<typeof colorFields[number]['key'], string>;
export type Palette = Record<PaletteMode, PaletteColors>;
export const paletteKey = 'appearance.palette';
export const defaultPalette: Palette = {
  light: { accent: '#007aff', background: '#f5f5f7', surface: '#ffffff', text: '#111114', secondary: '#6e6e73', navigation: '#17171a' },
  dark: { accent: '#007aff', background: '#0d0d0f', surface: '#1c1c1e', text: '#f5f5f7', secondary: '#aeaeb2', navigation: '#f5f5f7' },
};

export function readPalette(raw?: string): Palette {
  if (!raw) return defaultPalette;
  const value = JSON.parse(raw);
  const result = structuredClone(defaultPalette);
  for (const mode of ['light', 'dark'] as const) {
    for (const { key } of colorFields) {
      if (typeof value?.[mode]?.[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value[mode][key])) throw new Error('Invalid palette');
      result[mode][key] = value[mode][key].toLowerCase();
    }
  }
  return result;
}

export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
      .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
