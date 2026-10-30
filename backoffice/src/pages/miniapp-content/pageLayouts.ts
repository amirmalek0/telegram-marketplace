// Shared contract: kept identical in both frontend build contexts and verified by tests.
import { isTextWidgetType, textThemes, validTextWidget, widgetIdPattern, maxLayoutBytes, type TextWidget } from './textWidgets.ts';
import { validProductFacts, validProductFactIcons, type ProductFactIcons, type ProductFactsVisibility } from './productFacts.ts';
import { searchDesigns } from './headerSettings.ts';
import { imageWidgetType, imageThemes, validImageWidget, type ImageWidget } from './imageWidgets.ts';
import { validWidgetAppearance, type WidgetAppearance } from './widgetAppearance.ts';
export const pageIds = ['shop', 'profile', 'wallet', 'vip', 'orders', 'downloads', 'tickets', 'notifications', 'product', 'category', 'ticket', 'new-ticket'] as const;
export type PageId = typeof pageIds[number];
export const pageLabels: Record<PageId, string> = { shop: 'فروشگاه', profile: 'پروفایل', wallet: 'کیف پول', vip: 'پلن‌های VIP', orders: 'سفارش‌ها', downloads: 'دانلودها', tickets: 'تیکت‌ها', notifications: 'اعلان‌ها', product: 'جزئیات محصول', category: 'جزئیات دسته‌بندی', ticket: 'گفت‌وگوی تیکت', 'new-ticket': 'تیکت جدید' };
export const surfaceDesigns = ['original', 'soft', 'outlined', 'glass', 'compact'] as const;
export const designLabels: Record<string, string> = { original: 'فعلی', soft: 'رنگی ملایم', outlined: 'خطی', glass: 'شیشه‌ای', compact: 'فشرده', ribbon: 'نوار رنگی', grid: 'شبکه‌ای', pills: 'کپسولی', list: 'فهرست', tiles: 'کاشی', featured: 'تمام‌عرض', carousel: 'گالری' };
export type SectionSource = 'catalog' | 'account' | 'orders' | 'downloads' | 'tickets' | 'notifications' | 'product' | 'category' | 'ticket' | 'new-ticket' | 'custom';
export interface SectionDefinition { type: string; title: string; source: SectionSource; className: string; designs: readonly string[]; page?: PageId; required?: boolean }
const definition = (type: string, title: string, source: SectionSource, className: string, extra: Partial<SectionDefinition> = {}): SectionDefinition => ({ type, title, source, className, designs: surfaceDesigns, ...extra });
export const sectionLibrary: SectionDefinition[] = [
  definition('catalog.search', 'جست‌وجوی محصولات', 'custom', '', { designs: searchDesigns }),
  definition('catalog.categories', 'دسته‌بندی‌ها', 'catalog', 'shop-page', { designs: ['ribbon', 'grid', 'pills', 'list', 'tiles'] }),
  definition('catalog.products', 'محصولات فروشگاه', 'catalog', 'shop-page', { designs: ['list', 'grid', 'featured', 'compact', 'carousel'] }),
  definition('account.identity', 'اطلاعات حساب و موجودی', 'account', 'profile-page profile-home'),
  definition('account.shortcuts', 'میانبرهای خرید و پشتیبانی', 'account', 'profile-page profile-home'),
  definition('account.activity', 'فعالیت‌های اخیر', 'account', 'profile-page profile-home'),
  definition('account.referrals', 'دعوت دوستان', 'account', 'profile-page profile-home'),
  definition('wallet.balance', 'موجودی کیف پول', 'account', 'profile-page wallet-sections'),
  definition('wallet.packs', 'بسته‌های شارژ', 'account', 'profile-page wallet-sections'),
  definition('wallet.history', 'تاریخچه کیف پول', 'account', 'profile-page wallet-sections'),
  definition('vip.overview', 'وضعیت اشتراک VIP', 'account', 'profile-page vip-page membership-plans'),
  definition('vip.plans', 'پلن‌های VIP', 'account', 'profile-page vip-page membership-plans'),
  definition('orders.summary', 'خلاصه سفارش‌ها', 'orders', 'order-page'),
  definition('orders.list', 'فهرست سفارش‌ها و فیلترها', 'orders', 'order-page'),
  definition('downloads.summary', 'خلاصه دانلودها', 'downloads', 'commerce-page'),
  definition('downloads.list', 'فایل‌ها و دسترسی‌ها', 'downloads', 'commerce-page'),
  definition('tickets.intro', 'میانبر ثبت تیکت', 'tickets', 'tickets-page'),
  definition('tickets.list', 'فهرست تیکت‌ها و فیلترها', 'tickets', 'tickets-page'),
  definition('notifications.feed', 'صندوق اعلان‌ها', 'notifications', ''),
  definition('product.overview', 'تصویر و عنوان محصول', 'product', 'product-detail', { page: 'product' }),
  definition('product.checkout', 'خرید و دسترسی محصول', 'product', 'product-detail', { page: 'product', required: true, designs: ['original'] }),
  definition('product.description', 'توضیحات محصول', 'product', 'product-detail', { page: 'product' }),
  definition('product.facts', 'مشخصات محصول', 'product', 'product-detail', { page: 'product' }),
  definition('product.related', 'محصولات مرتبط', 'product', 'product-detail', { page: 'product' }),
  definition('category.overview', 'معرفی دسته‌بندی', 'category', 'category-detail-page', { page: 'category' }),
  definition('category.products', 'محصولات این دسته', 'category', 'category-detail-page', { page: 'category' }),
  definition('ticket.thread', 'گفت‌وگو و ارسال پیام', 'ticket', '', { page: 'ticket', required: true, designs: ['original'] }),
  definition('ticket.form', 'فرم ثبت تیکت', 'new-ticket', '', { page: 'new-ticket', required: true, designs: ['original'] }),
];
export const widgetLibrary: SectionDefinition[] = [
  definition('global.widget', 'ویجت سراسری', 'custom', '', { designs: ['original'] }),
  definition(imageWidgetType, 'تصویر', 'custom', '', { designs: imageThemes }),
  definition('text.heading', 'عنوان H1–H6', 'custom', '', { designs: textThemes }),
  definition('text.paragraph', 'پاراگراف', 'custom', '', { designs: textThemes }),
  ...sectionLibrary,
];
export interface PageSection { factIcons?: ProductFactIcons; facts?: ProductFactsVisibility; type: string; visible: boolean; design: string; id?: string; text?: TextWidget; image?: ImageWidget; widgetId?: string; appearance?: WidgetAppearance }
export const sectionKey = (item: PageSection) => item.id ?? item.type;
export interface PageLayout { version: 1; sections: PageSection[] }
export const pageLayoutPrefix = 'appearance.page.';
export const sectionDefinition = (type: string) => widgetLibrary.find(section => section.type === type);
export const defaultSections: Record<PageId, string[]> = {
  shop: ['catalog.categories', 'catalog.products'],
  profile: ['account.identity', 'account.shortcuts', 'account.activity', 'account.referrals'],
  wallet: ['wallet.balance', 'wallet.packs', 'wallet.history'],
  vip: ['vip.overview', 'vip.plans'],
  orders: ['orders.summary', 'orders.list'],
  downloads: ['downloads.summary', 'downloads.list'],
  tickets: ['tickets.intro', 'tickets.list'],
  notifications: ['notifications.feed'],
  product: ['product.overview', 'product.checkout', 'product.description', 'product.facts', 'product.related'],
  category: ['category.overview', 'category.products'],
  ticket: ['ticket.thread'],
  'new-ticket': ['ticket.form'],
};
export function defaultPageLayout(page: PageId): PageLayout {
  return { version: 1, sections: defaultSections[page].map(type => ({ type, visible: true, design: sectionDefinition(type)!.designs[0] })) };
}
export function parsePageLayout(value: unknown, page: PageId): PageLayout | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (new TextEncoder().encode(JSON.stringify(parsed)).length > maxLayoutBytes) return null;
    if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length !== 2 || parsed.version !== 1 || !Array.isArray(parsed.sections) || parsed.sections.length > 24) return null;
    const seen = new Set<string>();
    const sections: PageSection[] = [];
    for (const raw of parsed.sections) {
      const item = raw && typeof raw === 'object' ? { ...raw } : raw;
      if (!item || typeof item !== 'object' || typeof item.visible !== 'boolean') return null;
      const hasFacts = Object.prototype.hasOwnProperty.call(item, 'facts');
      if (hasFacts && (item.type !== 'product.facts' || !validProductFacts(item.facts))) return null;
      const facts = hasFacts ? { facts: { ...item.facts } } : {};
      delete item.facts;
      const hasFactIcons = Object.prototype.hasOwnProperty.call(item, 'factIcons');
      if (hasFactIcons && (item.type !== 'product.facts' || !validProductFactIcons(item.factIcons))) return null;
      const factIcons = hasFactIcons ? { factIcons: { ...item.factIcons } } : {};
      delete item.factIcons;
      const hasAppearance = Object.prototype.hasOwnProperty.call(item, 'appearance');
      if (hasAppearance && !validWidgetAppearance(item.appearance)) return null;
      const appearance = hasAppearance ? { appearance: structuredClone(item.appearance) } : {};
      delete item.appearance;
      if (item.type === 'global.widget') {
        if (Object.keys(item).length !== 5 || typeof item.id !== 'string' || !widgetIdPattern.test(item.id) || typeof item.widgetId !== 'string' || !widgetIdPattern.test(item.widgetId) || item.design !== 'original' || seen.has(item.id)) return null;
        seen.add(item.id);
        sections.push({ type: item.type, id: item.id, widgetId: item.widgetId, visible: item.visible, design: 'original', ...appearance });
        continue;
      }
      const image = item.type === imageWidgetType;
      const custom = isTextWidgetType(item.type) || image;
      if (Object.keys(item).length !== (custom ? 5 : 3)) return null;
      if (custom && (typeof item.id !== 'string' || !widgetIdPattern.test(item.id) || !(image ? validImageWidget(item.image) : validTextWidget(item.text, item.type)))) return null;
      const def = sectionDefinition(item.type);
      const key = sectionKey(item);
      if (!def || seen.has(key) || (def.page && def.page !== page) || !def.designs.includes(item.design) || (def.required && !item.visible)) return null;
      seen.add(key);
      sections.push({ type: item.type, visible: item.visible, design: item.design, ...facts, ...factIcons, ...appearance, ...(custom ? { id: item.id, ...(image ? { image: structuredClone(item.image) } : { text: structuredClone(item.text) }) } : {}) });
    }
    if (sectionLibrary.some(def => def.page === page && def.required && !seen.has(def.type))) return null;
    return { version: 1, sections };
  } catch { return null; }
}
export function pageForPath(path: string): PageId {
  if (path.startsWith('/products/')) return 'product';
  if (path.startsWith('/categories/')) return 'category';
  if (path === '/tickets/new') return 'new-ticket';
  if (path.startsWith('/tickets/')) return 'ticket';
  const slug = path.replace(/^\//, '');
  return pageIds.includes(slug as PageId) ? slug as PageId : 'shop';
}
