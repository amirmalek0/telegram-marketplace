import type { ChromeLayoutPreset } from './chromeLayoutPresets.ts';

// Lead with different compositions instead of showing five similar variants in a row.
export function orderLayoutThemes<T extends string>(themes: readonly T[], presets: Record<string,ChromeLayoutPreset>): T[] {
  const variants = [...new Set(Object.values(presets).map(preset=>preset.variant))];
  return [...themes].sort((a,b)=>variants.indexOf(presets[a]?.variant)-variants.indexOf(presets[b]?.variant));
}
