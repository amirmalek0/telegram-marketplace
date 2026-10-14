import { useEffect, useState } from 'react';
import { Boxes, Code2, FileText, Layers3, LoaderCircle, MessageSquareText } from 'lucide-react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { apisApi, bundlesApi, inventoryApi, messagesApi } from '@/api';
import { Select } from '@/components/ui';
import type { DeliveryType } from '@/types/products';
import type { ApiResponse } from '@/types/apis';
import type { BundleResponse } from '@/types/bundles';
import { ProductFilePicker } from './ProductFilePicker';
import type { InventoryResponse } from '@/types/inventory';
import type { MessageResponse } from '@/types/messages';
import type { ProductFormValues } from './productForm';

const icons = { file: FileText, message: MessageSquareText, inventory: Boxes, bundle: Layers3, api: Code2 };

export function ProductDeliveryField({ deliveryType, control, errors }: { deliveryType: DeliveryType; control: Control<ProductFormValues>; errors: FieldErrors<ProductFormValues> }) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [inventories, setInventories] = useState<InventoryResponse[]>([]);
  const [bundles, setBundles] = useState<BundleResponse[]>([]);
  const [apis, setApis] = useState<ApiResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (deliveryType === 'file') return;
    let active = true;
    setLoading(true);
    const load = async () => {
      if (deliveryType === 'message') setMessages((await messagesApi.list({ per_page: 100 })).data);
      if (deliveryType === 'inventory') setInventories((await inventoryApi.list({ per_page: 100 })).data);
      if (deliveryType === 'bundle') setBundles((await bundlesApi.list({ per_page: 100 })).data);
      if (deliveryType === 'api') setApis((await apisApi.list({ per_page: 100 })).data);
    };
    load().finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliveryType]);

  if (deliveryType === 'file') return <Controller name="file_ids" control={control} render={({ field }) => <ProductFilePicker value={field.value} onChange={field.onChange} error={errors.file_ids?.message} />} />;

  if (loading) return <div className="flex min-h-16 items-center gap-2 rounded-xl bg-[rgb(var(--color-surface-2))] px-4 text-xs text-[rgb(var(--color-text-secondary))]"><LoaderCircle size={16} className="animate-spin" />در حال دریافت منابع تحویل…</div>;

  const config = deliveryType === 'message'
      ? { name: 'message_id' as const, label: 'پیام تحویل', placeholder: 'یک پیام انتخاب کنید', options: messages.map(item => ({ value: item.id, label: item.content.slice(0, 70) })) }
      : deliveryType === 'inventory'
        ? { name: 'inventory_id' as const, label: 'مخزن موجودی', placeholder: 'یک مخزن انتخاب کنید', options: inventories.map(item => ({ value: item.id, label: item.name })) }
        : deliveryType === 'bundle'
          ? { name: 'bundle_id' as const, label: 'بسته تحویل', placeholder: 'یک بسته انتخاب کنید', options: bundles.map(item => ({ value: item.id, label: item.name })) }
          : { name: 'api_id' as const, label: 'اتصال API', placeholder: 'یک API انتخاب کنید', options: apis.map(item => ({ value: item.id, label: item.name })) };
  const DeliveryIcon = icons[deliveryType];

  return <div className="flex items-start gap-3 rounded-xl bg-[rgb(var(--color-surface-2))] p-4">
    <span className="mt-6 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600"><DeliveryIcon size={17} /></span>
    <div className="min-w-0 flex-1"><Controller name={config.name} control={control} render={({ field }) => <Select label={config.label} placeholder={config.placeholder} options={config.options} error={errors[config.name]?.message} value={field.value ?? ''} onChange={field.onChange} className="py-3" />}/></div>
  </div>;
}
