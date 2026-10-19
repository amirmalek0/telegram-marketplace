export const shopDesignsKey = 'appearance.shop_designs'
export const categoryDesigns = ['ribbon', 'grid', 'pills', 'list', 'tiles'] as const
export const productDesigns = ['list', 'grid', 'featured', 'compact', 'carousel'] as const
export type ShopDesigns = { categories: typeof categoryDesigns[number]; products: typeof productDesigns[number] }
export const defaultShopDesigns: ShopDesigns = { categories: 'ribbon', products: 'list' }

export function parseShopDesigns(value: unknown): ShopDesigns | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (Object.keys(parsed).length !== 2 || !categoryDesigns.includes(parsed.categories) || !productDesigns.includes(parsed.products)) return null
    return { categories: parsed.categories, products: parsed.products }
  } catch { return null }
}
