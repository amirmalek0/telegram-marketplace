export const shopArrangementKey = 'appearance.shop_sections';
export type ShopSection = 'categories' | 'products';
export interface ShopArrangement { order: ShopSection[]; hidden: ShopSection[] }
export const defaultShopSections: ShopSection[] = ['categories', 'products'];
export const defaultShopArrangement: ShopArrangement = { order: [...defaultShopSections], hidden: [] };

export function parseShopArrangement(value: unknown): ShopArrangement | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    // Previously saved arrays remain valid: both sections were visible.
    const config = Array.isArray(parsed) ? { order: parsed, hidden: [] } : parsed;
    if (!config || typeof config !== 'object' || Object.keys(config).length !== 2) return null;
    const { order, hidden } = config;
    if (!Array.isArray(order) || order.length !== 2 || !defaultShopSections.every(section => order.includes(section))) return null;
    if (!Array.isArray(hidden) || hidden.length > 2 || new Set(hidden).size !== hidden.length
      || !hidden.every(section => defaultShopSections.includes(section))) return null;
    return { order: [...order], hidden: defaultShopSections.filter(section => hidden.includes(section)) };
  } catch { return null; }
}

export function parseShopSections(value: unknown): ShopSection[] | null {
  const config = parseShopArrangement(value);
  return config ? config.order.filter(section => !config.hidden.includes(section)) : null;
}
