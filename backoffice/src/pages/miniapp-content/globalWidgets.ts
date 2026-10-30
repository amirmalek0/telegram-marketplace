// Shared global-widget contract: keep both frontend copies identical.
import { parsePageLayout, sectionDefinition, sectionKey, type PageLayout, type PageSection } from './pageLayouts.ts';
import { maxLayoutBytes, widgetIdPattern } from './textWidgets.ts';
import { isNavigationIcon, type NavigationIcon } from './navigationSettings.ts';

export const globalWidgetPrefix = 'appearance.widget.';
export const defaultGlobalWidgetIcon: NavigationIcon = 'lucide:globe';
export interface GlobalWidget { version: 1; name: string; icon?: NavigationIcon; sections: PageSection[] }
export type GlobalWidgets = Record<string, GlobalWidget>;
export const reusableSection = (item: PageSection) => item.type !== 'global.widget' && !!sectionDefinition(item.type) && !sectionDefinition(item.type)?.page;
export function parseGlobalWidget(value: unknown): GlobalWidget | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).some(key => !['version', 'name', 'sections', 'icon'].includes(key)) || parsed.version !== 1 || typeof parsed.name !== 'string' || !parsed.name.trim() || [...parsed.name].length > 80 || new TextEncoder().encode(JSON.stringify(parsed)).length > maxLayoutBytes) return null;
    if ('icon' in parsed && !isNavigationIcon(parsed.icon)) return null;
    const layout = parsePageLayout({ version: 1, sections: parsed.sections }, 'shop');
    if (!layout?.sections.length || !layout.sections.every(reusableSection)) return null;
    return { version: 1, name: parsed.name, sections: layout.sections, ...('icon' in parsed ? { icon: parsed.icon } : {}) };
  } catch { return null; }
}
export function readGlobalWidgets(content: Record<string, string>): GlobalWidgets {
  const result: GlobalWidgets = {};
  for (const [key, value] of Object.entries(content)) {
    if (!key.startsWith(globalWidgetPrefix)) continue;
    const id = key.slice(globalWidgetPrefix.length), widget = parseGlobalWidget(value);
    if (widgetIdPattern.test(id) && widget) result[id] = widget;
  }
  return result;
}
export function newGlobalReference(widgetId: string): PageSection {
  return { type: 'global.widget', id: 'widget-' + crypto.randomUUID(), widgetId, visible: true, design: 'original' };
}
export interface ResolvedSection { item: PageSection; key: string; ownerId?: string }
export function resolveGlobalWidgets(layout: PageLayout, library: GlobalWidgets): ResolvedSection[] {
  return layout.sections.flatMap(item => item.type === 'global.widget'
    ? (library[item.widgetId!]?.sections ?? []).map(child => ({ item: { ...child, visible: item.visible && child.visible }, key: sectionKey(item) + '/' + sectionKey(child), ownerId: item.id }))
    : [{ item, key: sectionKey(item) }]).slice(0, 24);
}
export function globalLayoutError(layout: PageLayout, library: GlobalWidgets): string | null {
  let count = 0;
  const types = new Set<string>();
  for (const item of layout.sections) {
    const children = item.type === 'global.widget' ? library[item.widgetId!]?.sections : [item];
    if (!children) return 'یک ویجت سراسری پیدا نشد؛ آن را از صفحه حذف کنید.';
    count += children.length;
    for (const child of children) {
      if (child.id) continue;
      if (types.has(child.type)) return 'ویجت آماده «' + sectionDefinition(child.type)?.title + '» در این صفحه تکراری است.';
      types.add(child.type);
    }
  }
  return count > 24 ? 'مجموع ویجت‌ها، شامل اعضای گروه‌ها، نباید بیشتر از ۲۴ باشد.' : null;
}
export function independentSections(items: PageSection[]): PageSection[] {
  return items.map(item => ({ ...structuredClone(item), ...(item.id ? { id: 'widget-' + crypto.randomUUID() } : {}) }));
}

export function removeGlobalWidgetFromLayouts<T extends Record<string, PageLayout>>(layouts: T, widgetId: string): T {
  return Object.fromEntries(Object.entries(layouts).map(([page, layout]) => [page, {
    ...layout,
    sections: layout.sections.filter(item => item.type !== 'global.widget' || item.widgetId !== widgetId),
  }])) as T;
}
