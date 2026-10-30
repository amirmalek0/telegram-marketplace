import { useEffect, useState } from 'react';
import { Check, CreditCard, Crown, Package, Star, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { SystemHeader } from '@/components/system/SystemHeader';
import { PaymentMethodSettings } from './PaymentMethodSettings';
import { Link } from 'react-router-dom';

type Mode = 'both' | 'stars_first' | 'toman_first';
type Config = Record<'product' | 'vip_plan' | 'wallet_topup', Mode>;
const defaults: Config = { product: 'stars_first', vip_plan: 'stars_first', wallet_topup: 'stars_first' };
const key = 'appearance.checkout';
const options = [
  { value: 'both', title: 'هر دو قیمت', hint: 'ابتدا هر دو قیمت؛ سپس دکمه انتخاب روش پرداخت و نمایش هر دو روش.' },
  { value: 'stars_first', title: 'Stars در اولویت', hint: 'قیمت (Stars) و پرداخت با Stars در ابتدا؛ کارت‌به‌کارت به‌عنوان روش دیگر در پایین.' },
  { value: 'toman_first', title: 'تومان در اولویت', hint: 'قیمت (تومان) و پرداخت کارت‌به‌کارت در ابتدا؛ Stars به‌عنوان روش دیگر در پایین.' },
] as const;
const purposes = [{ key: 'product', title: 'محصولات', icon: Package }, { key: 'vip_plan', title: 'پلن‌های VIP', icon: Crown }, { key: 'wallet_topup', title: 'بسته‌های کیف پول', icon: WalletCards }] as const;
export default function CheckoutSettingsPage() {
  const [value, setValue] = useState<Config>(defaults), [saved, setSaved] = useState<Config>(defaults);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false);
    try {
      const { data } = await apiClient.get<{ data: Record<string, string> }>('/miniapp-content');
      const raw = JSON.parse(data.data[key] || '{}');
      const config = Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [name, options.some(option => option.value === raw?.[name]) ? raw[name] : fallback])) as Config;
      setValue(config); setSaved(config);
    } catch { setError(true); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const dirty = JSON.stringify(saved) !== JSON.stringify(value);
  const save = async () => {
    if (saving || loading || error) return;
    setSaving(true);
    try { await apiClient.put('/miniapp-content/' + key, { value: JSON.stringify(value) }); setSaved(value); toast.success('نمایش پرداخت ذخیره شد'); }
    catch { toast.error('ذخیره تنظیمات ناموفق بود'); } finally { setSaving(false); }
  };
  return <div className="system-page">
    <SystemHeader title="تنظیمات پرداخت" icon={CreditCard} />
    <PaymentMethodSettings />
    <Link to="/payments/manual" className="text-sm font-semibold text-blue-600 underline">مدیریت کارت‌های مقصد و پیام‌های کارت‌به‌کارت</Link>
    <h2 className="text-base font-bold">نمایش قیمت و مراحل پرداخت در مینی‌اپ</h2>
    <div className="surface-card p-5 text-sm leading-7 text-[rgb(var(--color-text-secondary))]">نحوه نمایش قیمت و انتخاب روش پرداخت را برای هر نوع خرید مشخص کنید. گزینه‌های نمایش زیر، وضعیت فعال‌سازی روش‌ها را تغییر نمی‌دهند؛ روش غیرفعال یا قیمت تومانی تنظیم‌نشده نمایش داده نمی‌شود. موجودی کیف پول و دسترسی رایگان VIP بدون تغییر باقی می‌مانند.</div>
    {error ? <div role="alert" className="surface-card p-5">دریافت تنظیمات ناموفق بود <Button onClick={() => void load()}>تلاش دوباره</Button></div> : loading ? <div role="status">در حال دریافت…</div> : purposes.map(purpose => <fieldset disabled={saving} className="surface-card p-5" key={purpose.key}>
      <legend className="sr-only">{purpose.title}</legend><h2 className="mb-5 flex items-center gap-2 text-base font-bold"><purpose.icon size={20} />{purpose.title}</h2>
      <div className="grid gap-3 md:grid-cols-3">{options.map(option => <label key={option.value} className={`relative cursor-pointer rounded-2xl border p-4 transition-colors ${value[purpose.key] === option.value ? 'border-blue-500 bg-blue-500/5' : 'border-[rgb(var(--color-border))]'}`}>
        <input className="sr-only peer" type="radio" name={purpose.key} value={option.value} checked={value[purpose.key] === option.value} onChange={() => setValue(current => ({ ...current, [purpose.key]: option.value }))} />
        <span className="mb-4 flex min-h-16 items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-surface-2))] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-blue-500">
          {option.value !== 'toman_first' && <span className="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--color-border))] p-2 text-sm font-bold">۵۰ <Star size={16} className="text-amber-500" fill="currentColor" /></span>}
          {option.value !== 'stars_first' && <span className="rounded-lg border border-[rgb(var(--color-border))] p-2 text-sm font-bold">۲۰۰٬۰۰۰ <small>تومان</small></span>}
        </span><span className="flex items-center justify-between gap-2 font-bold text-sm">{option.title}{value[purpose.key] === option.value && <Check size={16} className="text-blue-500" />}</span><small className="mt-2 block leading-6 text-[rgb(var(--color-text-secondary))]">{option.hint}</small>
      </label>)}</div>
    </fieldset>)}
    <div className="flex justify-end gap-3"><Button variant="secondary" disabled={!dirty || saving} onClick={() => setValue(saved)}>لغو تغییرات</Button><Button loading={saving} disabled={!dirty || loading || error} onClick={() => void save()}>ذخیره تنظیمات نمایش</Button></div>
  </div>;
}
