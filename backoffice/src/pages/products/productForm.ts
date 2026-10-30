import { z } from 'zod';
import type { CreateProductRequest, DeliveryType, ProductStatus, UpdateProductRequest } from '@/types/products';

export const deliveryTypeLabels: Record<DeliveryType, string> = {
  file: 'فایل',
  message: 'پیام',
  inventory: 'مخزن',
  bundle: 'بسته',
  api: 'API',
};

export const statusLabels: Record<ProductStatus, string> = {
  active: 'فعال',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

export const productSchema = z.object({
  title: z.string().min(1, 'نام محصول الزامی است'),
  description: z.string(),
  stars_price: z.number({ message: 'قیمت استار باید عدد باشد' }).int('قیمت باید عدد صحیح باشد').positive('قیمت باید بیشتر از صفر باشد'),
  toman_price: z.number().int('قیمت باید عدد صحیح باشد').min(0).max(1_000_000_000),
  payment_methods_override: z.boolean(),
  stars_enabled: z.boolean(),
  card_to_card_enabled: z.boolean(),
  category_id: z.string().min(1, 'دسته‌بندی الزامی است'),
  delivery_type: z.enum(['file', 'message', 'inventory', 'bundle', 'api'] as const),
  file_ids: z.array(z.string()).max(100, 'حداکثر ۱۰۰ فایل انتخاب کنید'),
  message_id: z.string().optional(),
  inventory_id: z.string().optional(),
  bundle_id: z.string().optional(),
  api_id: z.string().optional(),
  demo_url: z.string().optional(),
  vip_only: z.boolean(),
  repurchasable: z.boolean(),
  status: z.enum(['active', 'draft', 'archived'] as const),
}).superRefine((data, ctx) => {
  if (data.delivery_type === 'file' && data.file_ids.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['file_ids'], message: 'حداقل یک فایل انتخاب کنید' });
  }
});

export type ProductFormValues = z.infer<typeof productSchema>;

export const productDefaultValues: ProductFormValues = {
  title: '', description: '', stars_price: 1, toman_price: 0, payment_methods_override: false, stars_enabled: true, card_to_card_enabled: false, category_id: '', delivery_type: 'file',
  file_ids: [], message_id: '', inventory_id: '', bundle_id: '', api_id: '', demo_url: '',
  vip_only: false, repurchasable: true, status: 'active',
};

export function productPayload(data: ProductFormValues): CreateProductRequest & Pick<UpdateProductRequest, 'status'> {
  return {
    title: data.title,
    description: data.description,
    stars_price: data.stars_price,
    toman_price: data.toman_price, payment_methods_override: data.payment_methods_override, stars_enabled: data.stars_enabled, card_to_card_enabled: data.card_to_card_enabled,
    category_id: data.category_id,
    delivery_type: data.delivery_type,
    demo_url: data.demo_url || undefined,
    vip_only: data.vip_only,
    repurchasable: data.repurchasable,
    status: data.status,
    file_ids: data.delivery_type === 'file' ? data.file_ids : undefined,
    message_id: data.delivery_type === 'message' ? data.message_id || undefined : undefined,
    inventory_id: data.delivery_type === 'inventory' ? data.inventory_id || undefined : undefined,
    bundle_id: data.delivery_type === 'bundle' ? data.bundle_id || undefined : undefined,
    api_id: data.delivery_type === 'api' ? data.api_id || undefined : undefined,
  };
}
