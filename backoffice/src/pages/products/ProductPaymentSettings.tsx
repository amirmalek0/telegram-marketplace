import { Controller, type UseFormReturn } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { CreditCard, Star } from 'lucide-react';
import { Input, Toggle } from '@/components/ui';
import type { ProductFormValues } from './productForm';
import { CatalogPrices } from '@/components/catalog/CatalogPrices';

export function ProductPaymentSettings({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const override = form.watch('payment_methods_override');
  return <section className="p-5 sm:p-7">
    <div className="catalog-editor-heading"><span><CreditCard size={19}/></span><h2>قیمت و روش‌های پرداخت</h2></div>
    <div className="mb-5 max-w-sm rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4"><CatalogPrices stars={form.watch('stars_price')} toman={form.watch('toman_price')} /></div>
    <div className="grid gap-4 md:grid-cols-2">
    <Input label="قیمت (Stars)" type="number" min="1" step="1" rightIcon={<Star size={18} fill="currentColor" className="text-amber-500"/>} hint="مبلغ بدون اعشار است" error={form.formState.errors.stars_price?.message} className="py-3.5 text-base font-bold" {...form.register('stars_price', { valueAsNumber: true })}/>
    <Input label="قیمت (تومان)" type="number" min="0" max="1000000000" step="1" hint="قیمت مستقل از Stars؛ صفر یعنی کارت‌به‌کارت برای این محصول ارائه نمی‌شود." error={form.formState.errors.toman_price?.message} {...form.register('toman_price', { valueAsNumber: true })}/>
    </div>
    <div className="mt-5 flex items-center justify-between gap-4 border-t border-[rgb(var(--color-border))] pt-5">
      <div><h3 className="text-sm font-bold">روش‌های اختصاصی این محصول</h3><p className="mt-1 text-xs leading-6 text-[rgb(var(--color-text-secondary))]">{override ? 'انتخاب‌های زیر جایگزین تنظیمات عمومی می‌شوند.' : 'این محصول از تنظیمات عمومی روش‌های پرداخت پیروی می‌کند.'}</p></div>
      <Controller name="payment_methods_override" control={form.control} render={({ field }) => <Toggle ariaLabel="روش‌های اختصاصی این محصول" checked={field.value} onChange={field.onChange}/>}/>
    </div>
    {override ? <div className="mt-4 grid gap-4 rounded-xl border border-[rgb(var(--color-border))] p-4 sm:grid-cols-2">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><Star size={17}/>Telegram Stars</span><Controller name="stars_enabled" control={form.control} render={({ field }) => <Toggle ariaLabel="Telegram Stars برای محصول" checked={field.value} onChange={field.onChange}/>}/></div>
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm"><CreditCard size={17}/>کارت‌به‌کارت</span><Controller name="card_to_card_enabled" control={form.control} render={({ field }) => <Toggle ariaLabel="کارت‌به‌کارت برای محصول" checked={field.value} onChange={field.onChange}/>}/></div>
    </div> : <Link to="/settings" className="mt-3 inline-block text-xs text-sky-600">مشاهده تنظیمات عمومی پرداخت</Link>}
    <p className="mt-3 text-xs leading-6 text-[rgb(var(--color-text-secondary))]">پرداخت از موجودی کیف پول و دسترسی رایگان VIP تغییر نمی‌کند. کارت‌به‌کارت به قیمت مثبت و کارت مقصد فعال نیاز دارد.</p>
  </section>;
}
