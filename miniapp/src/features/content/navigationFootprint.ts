import { navigationLayoutPresets } from './chromeLayoutPresets.ts';
import type { NavigationSettings } from './navigationSettings.ts';

// Reserve the expanded size even while scrolling so compact mode cannot cause scroll jumps.
export function navigationFootprint(settings: NavigationSettings): number {
  if (!settings.labels) return 96;
  const family = settings.positioning ?? navigationLayoutPresets[settings.theme]?.family;
  const count = settings.items.filter(item => item.visible).length;
  const rows = family === 'launcher' ? Math.ceil(count / 3) : family === 'inline' && count > 3 ? 1.65 : 1;
  const extra = family === 'labelrail' ? settings.labelSize * 1.4 + 8 : 0;
  return Math.max(96, Math.ceil(settings.height * rows + extra) + 38);
}
