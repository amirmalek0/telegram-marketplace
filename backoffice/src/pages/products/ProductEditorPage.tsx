import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Star, Crown, ExternalLink, Image as ImageIcon, Package, PackagePlus, RefreshCw, Save, ShoppingBag, Tag, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { categoriesApi, productsApi } from '@/api';
import { Button, FileUpload, Input, Select, Textarea, Toggle } from '@/components/ui';
import type { CategoryResponse } from '@/types/categories';
import type { DeliveryType, ProductResponse } from '@/types/products';
import { publicAssetURL } from '@/utils/assets';
import { ProductDeliveryField } from './ProductDeliveryField';
import { deliveryTypeLabels, productDefaultValues, productPayload, productSchema, statusLabels, type ProductFormValues } from './productForm';
import '@/components/catalog/catalog.css';

function SectionTitle({ icon, title }: { icon: ReactNode; title: string; description?: string }) {
  return <div className="catalog-editor-heading"><span>{icon}</span><h2>{title}</h2></div>;
}

function SettingRow({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"><span className="mt-0.5 text-[rgb(var(--color-text-secondary))]">{icon}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-[11px] leading-5 text-[rgb(var(--color-text-secondary))]">{description}</p></div>{children}</div></div></div>;
}

export default function ProductEditorPage() {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [product, setProduct] = useState<ProductResponse | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productSchema), defaultValues: productDefaultValues });
  const deliveryType = form.watch('delivery_type') as DeliveryType;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      categoriesApi.list({ per_page: 200 }, controller.signal),
      productId ? productsApi.getById(productId, controller.signal) : Promise.resolve(null),
    ]).then(([categoryPage, current]) => {
      setCategories(categoryPage.data);
      if (current) {
        setProduct(current);
        form.reset({
          title: current.title, description: current.description, stars_price: current.stars_price,
          category_id: current.category_id, delivery_type: current.delivery_type,
          file_ids: current.file_ids ?? (current.file_id ? [current.file_id] : []), message_id: current.message_id ?? '', inventory_id: current.inventory_id ?? '', bundle_id: current.bundle_id ?? '', api_id: current.api_id ?? '',
          demo_url: current.demo_url ?? '', vip_only: current.vip_only, repurchasable: current.repurchasable, status: current.status,
        });
      }
    }).catch(error => {
      if (error?.code !== 'ERR_CANCELED') toast.error(isEdit ? 'دریافت اطلاعات محصول ناموفق بود' : 'دریافت اطلاعات فرم ناموفق بود');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [form, isEdit, productId]);

  const categoryOptions = useMemo(() => categories.map(item => ({ value: item.id, label: item.active ? item.title : `${item.title} (غیرفعال)` })), [categories]);
  const deliveryOptions = useMemo(() => Object.entries(deliveryTypeLabels).map(([value, label]) => ({ value, label })), []);
  const statusOptions = useMemo(() => Object.entries(statusLabels).map(([value, label]) => ({ value, label })), []);

  const submit = async (values: ProductFormValues) => {
    if (!isEdit && !imageFile) {
      toast.error('انتخاب تصویر اصلی محصول الزامی است');
      return;
    }
    setSaving(true);
    let created: ProductResponse | null = null;
    try {
      const payload = productPayload(values);
      if (productId) {
        await productsApi.update(productId, payload);
        if (imageFile) await productsApi.uploadImage(productId, imageFile);
        toast.success('تغییرات محصول ذخیره شد');
      } else {
        const { status: _status, ...createPayload } = payload;
        created = await productsApi.create(createPayload);
        await productsApi.uploadImage(created.id, imageFile as File);
        toast.success('محصول جدید ایجاد شد');
      }
      navigate('/products');
    } catch {
      if (created) await productsApi.delete(created.id).catch(() => undefined);
      toast.error(isEdit ? 'ذخیره تغییرات ناموفق بود' : 'ایجاد محصول ناموفق بود');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-5"><div className="h-20 animate-pulse rounded-2xl bg-[rgb(var(--color-surface-2))]"/><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="h-[540px] animate-pulse rounded-2xl bg-[rgb(var(--color-surface-2))]"/><div className="h-[420px] animate-pulse rounded-2xl bg-[rgb(var(--color-surface-2))]"/></div></div>;

  return <form onSubmit={form.handleSubmit(submit)} className="catalog-editor space-y-5">
    <header className="catalog-editor-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3"><button type="button" onClick={() => navigate('/products')} className="icon-button" aria-label="بازگشت"><ArrowRight size={19}/></button><span className="catalog-heading-icon">{isEdit ? <Package size={22}/> : <PackagePlus size={22}/>}</span><h1 className="text-xl font-bold">{isEdit ? 'ویرایش محصول' : 'محصول جدید'}</h1></div>
      <div className="flex items-center gap-2"><Button type="button" variant="secondary" onClick={() => navigate('/products')}>انصراف</Button><Button type="submit" loading={saving} icon={isEdit ? <Save size={16}/> : <PackagePlus size={16}/>}>{isEdit ? 'ذخیره تغییرات' : 'ایجاد محصول'}</Button></div>
    </header>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="surface-card overflow-hidden">
        <section className="p-5 sm:p-7">
          <SectionTitle icon={<Package size={19}/>} title="اطلاعات اصلی" description="اطلاعاتی که کاربر در فروشگاه و صفحه محصول می‌بیند." />
          <div className="space-y-5">
            <Input label="عنوان محصول" placeholder="یک عنوان روشن و کوتاه بنویسید" rightIcon={<Tag size={18}/>} error={form.formState.errors.title?.message} className="py-3.5 text-base font-semibold" {...form.register('title')} />
            <Textarea label="توضیحات محصول" placeholder="ویژگی‌ها، کاربرد و جزئیات مهم محصول را توضیح دهید…" rows={7} error={form.formState.errors.description?.message} className="min-h-48 py-4 text-sm leading-7" {...form.register('description')} />
            <div className="grid gap-4 md:grid-cols-2">
              <Controller name="category_id" control={form.control} render={({ field }) => <Select label="دسته‌بندی" placeholder="انتخاب دسته‌بندی" options={categoryOptions} error={form.formState.errors.category_id?.message} value={field.value} onChange={field.onChange} className="py-3.5 text-base"/>}/>
              <Input label="قیمت با Telegram Stars" type="number" min="1" step="1" rightIcon={<Star size={18} fill="currentColor" className="text-amber-500"/>} hint="مبلغ بدون اعشار است" error={form.formState.errors.stars_price?.message} className="py-3.5 text-base font-bold" {...form.register('stars_price', { valueAsNumber: true })}/>
            </div>
          </div>
        </section>

        <div className="mx-5 border-t border-[rgb(var(--color-border))] sm:mx-7" />

        <section className="p-5 sm:p-7">
          <SectionTitle icon={<Truck size={19}/>} title="تحویل محصول" description="نوع محتوایی که بعد از پرداخت در اختیار کاربر قرار می‌گیرد." />
          <div className="space-y-4">
            <Controller name="delivery_type" control={form.control} render={({ field }) => <Select label="روش تحویل" options={deliveryOptions} error={form.formState.errors.delivery_type?.message} value={field.value} onChange={field.onChange} className="py-3.5 text-base"/>}/>
            <ProductDeliveryField deliveryType={deliveryType} control={form.control} errors={form.formState.errors}/>
          </div>
        </section>
      </main>

      <aside className="space-y-5 xl:sticky xl:top-[92px]">
        <section className="surface-card p-5">
          <SectionTitle icon={<BadgeCheck size={18}/>} title="انتشار و دسترسی" description="وضعیت نمایش و قوانین خرید محصول." />
          <div className="divide-y divide-[rgb(var(--color-border))]">
            {isEdit && <div className="pb-4"><Controller name="status" control={form.control} render={({ field }) => <Select label="وضعیت محصول" options={statusOptions} value={field.value} onChange={field.onChange} error={form.formState.errors.status?.message}/>}/></div>}
            <SettingRow icon={<Crown size={17}/>} title="محصول ویژه VIP" description="کاربر دارای اشتراک فعال، این محصول را رایگان دریافت می‌کند."><Controller name="vip_only" control={form.control} render={({ field }) => <Toggle size="sm" checked={field.value} onChange={field.onChange}/>}/></SettingRow>
            <SettingRow icon={<RefreshCw size={17}/>} title="خرید مجدد" description="در صورت خاموش بودن، هر کاربر فقط یک‌بار امکان خرید دارد."><Controller name="repurchasable" control={form.control} render={({ field }) => <Toggle size="sm" checked={field.value} onChange={field.onChange}/>}/></SettingRow>
          </div>
        </section>

        <section className="surface-card p-5">
          <SectionTitle icon={<ImageIcon size={18}/>} title="تصویر اصلی" description="تصویر کارت محصول و صفحه جزئیات." />
          {product?.image_url && !imageFile && <img src={publicAssetURL(product.image_url)} alt={product.title} className="mb-4 aspect-[16/10] w-full rounded-xl border border-[rgb(var(--color-border))] object-cover"/>}
          <FileUpload onFileSelect={setImageFile} accept="image/*" maxSize={5} label={product?.image_url ? 'جایگزینی تصویر' : 'انتخاب تصویر'} hint={isEdit ? 'اختیاری؛ در صورت انتخاب تصویر فعلی جایگزین می‌شود.' : 'الزامی؛ حداکثر ۵ مگابایت.'} className="[&_label]:p-5 [&_img]:h-40" />
        </section>

        <section className="surface-card p-5">
          <SectionTitle icon={<ExternalLink size={18}/>} title="نسخه نمایشی" description="پیوند اختیاری برای مشاهده دمو یا پیش‌نمایش." />
          <Input type="url" placeholder="https://example.com/demo" dir="ltr" leftIcon={<ExternalLink size={16}/>} error={form.formState.errors.demo_url?.message} {...form.register('demo_url')}/>
        </section>

        <div className="surface-card flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600"><ShoppingBag size={17}/></span><p className="flex-1 text-xs leading-5 text-[rgb(var(--color-text-secondary))]">قبل از ذخیره، روش تحویل و منبع انتخاب‌شده را بررسی کنید.</p><Button type="submit" size="sm" loading={saving} icon={<Save size={14}/>}>ذخیره</Button></div>
      </aside>
    </div>
  </form>;
}
