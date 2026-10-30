import { useEffect, useState } from 'react';
import { CreditCard, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button, Toggle } from '@/components/ui';

interface Methods { telegram_stars: boolean; card_to_card: boolean; revision: number }
export function PaymentMethodSettings() {
  const [value, setValue] = useState<Methods | null>(null);
  const [saved, setSaved] = useState<Methods | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    try { setError(''); const { data } = await apiClient.get<Methods>('/payment/methods/config'); setValue(data); setSaved(data); }
    catch { setError('دریافت روش‌های پرداخت ناموفق بود'); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    if (!value || busy) return;
    setBusy(true);
    try { const { data } = await apiClient.put<Methods>('/payment/methods', value); setValue(data); setSaved(data); toast.success('روش پرداخت ذخیره شد'); }
    catch (error: any) { toast.error(error.response?.data?.error || 'ذخیره ناموفق بود'); }
    finally { setBusy(false); }
  };
  const dirty = value && saved && (value.telegram_stars !== saved.telegram_stars || value.card_to_card !== saved.card_to_card);
  return <section className="surface-card system-setting">
    <div className="system-setting-top"><span className="system-setting-icon"><CreditCard size={21}/></span><div className="system-setting-title"><h2>فعال‌سازی روش‌های پرداخت</h2></div><Button size="sm" disabled={!dirty || busy} loading={busy} onClick={() => void save()}>ذخیره روش‌های پرداخت</Button></div>
    <div className="system-setting-body space-y-4">
      {error ? <div role="alert">{error}<Button size="sm" variant="secondary" onClick={() => void load()}>تلاش دوباره</Button></div> : !value ? <p role="status">در حال دریافت…</p> : <>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgb(var(--color-border))] p-4"><span className="flex items-center gap-2 font-bold"><Star size={19}/>Telegram Stars</span><Toggle ariaLabel="فعال‌سازی Telegram Stars" disabled={busy} checked={value.telegram_stars} onChange={enabled => setValue({ ...value, telegram_stars: enabled })}/></div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-[rgb(var(--color-border))] p-4"><span className="flex items-center gap-2 font-bold"><CreditCard size={19}/>کارت‌به‌کارت</span><Toggle ariaLabel="فعال‌سازی کارت‌به‌کارت" disabled={busy} checked={value.card_to_card} onChange={enabled => setValue({ ...value, card_to_card: enabled })}/></div>
        </div>
        <details className="text-xs leading-7"><summary className="cursor-pointer">دامنه فعال‌سازی و شرایط پرداخت</summary><p>برای محصولات، پلن‌های VIP و شارژ کیف پول اعمال می‌شود. محصولات به‌صورت پیش‌فرض پیروی می‌کنند؛ در ویرایش هر محصول می‌توانید انتخاب متفاوتی ثبت کنید.</p>
        {!value.telegram_stars && !value.card_to_card && <p className="text-amber-600">هر دو روش خاموش‌اند؛ خرید با موجودی کیف پول و دسترسی VIP همچنان فعال است. محصول دارای تنظیم اختصاصی از انتخاب خودش پیروی می‌کند.</p>}
        <p>تغییرات برای پرداخت‌های جدید است؛ بررسی و تسویه پرداخت‌های قبلی متوقف نمی‌شود.</p>
        <p className="text-xs">کارت‌به‌کارت فقط با قیمت تومانی مثبت و کارت مقصد فعال نمایش داده می‌شود. تلگرام برای کالاهای دیجیتال استفاده از Stars را الزامی می‌داند.</p></details>
      </>}
    </div>
  </section>;
}
