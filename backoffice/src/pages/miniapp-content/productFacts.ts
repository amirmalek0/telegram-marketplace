import { isNavigationIcon, type NavigationIcon } from './navigationSettings.ts';

// Shared presentation contract; omitted fields remain visible for existing layouts.
export const productFactFields = {
  category: 'دسته‌بندی',
  delivery: 'روش تحویل',
  views: 'بازدید',
  access: 'دسترسی',
  repurchasable: 'دفعات خرید',
  published: 'تاریخ انتشار',
  demo: 'لینک نسخه نمایشی',
} as const;
export type ProductFactField = keyof typeof productFactFields;
export type ProductFactIcons = Partial<Record<ProductFactField, NavigationIcon>>;
export const defaultProductFactIcons: Record<ProductFactField, NavigationIcon> = {
  category: 'box', delivery: 'file', views: 'eye', access: 'profile',
  repurchasable: 'orders', published: 'sparkles', demo: 'lucide:arrow-up-left',
};
export function validProductFactIcons(value: unknown): value is ProductFactIcons {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([key, icon]) => Object.prototype.hasOwnProperty.call(productFactFields, key) && isNavigationIcon(icon));
}
export type ProductFactsVisibility = Partial<Record<ProductFactField, boolean>>;
export function validProductFacts(value: unknown): value is ProductFactsVisibility {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([key, visible]) => Object.prototype.hasOwnProperty.call(productFactFields, key) && typeof visible === 'boolean');
}
export const showProductFact = (value: ProductFactsVisibility | undefined, field: ProductFactField) => value?.[field] !== false;
