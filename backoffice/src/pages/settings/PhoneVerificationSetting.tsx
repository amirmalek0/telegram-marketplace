import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsApi, type GeneralSettings } from '@/api/settings';
import { Button, Toggle } from '@/components/ui';

export function PhoneVerificationSetting() {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setSettings(await settingsApi.getGeneral()); }
    catch { toast.error('دریافت تنظیمات شماره تلفن ناموفق بود'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (required: boolean) => {
    if (saving || !settings) return;
    setSaving(true);
    try {
      setSettings(await settingsApi.updateGeneral(required));
      toast.success(required ? 'تأیید شماره تلفن الزامی شد' : 'الزام تأیید شماره تلفن برداشته شد');
    } catch { toast.error('ذخیره تنظیمات ناموفق بود'); }
    finally { setSaving(false); }
  };
  return <section className="surface-card mt-4 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-500"><Phone size={20} /></span>
      <div><h3 className="text-sm font-bold">الزام تأیید شماره تلفن</h3>
        <p className="mt-1 max-w-2xl text-xs leading-6 text-[rgb(var(--color-text-secondary))]">کاربران باید شماره حساب خود را از طریق تلگرام به اشتراک بگذارند. تا زمان تأیید، مینی‌اپ و APIهای آن در دسترس نیستند. این تنظیم بلافاصله برای کاربران فعلی و جدید اعمال می‌شود.</p>
        <p className="mt-1 text-xs leading-6 text-[rgb(var(--color-text-muted))]">شماره‌ای که دستی ثبت شده باشد تأییدشده محسوب نمی‌شود. ربات باید روشن باشد تا اشتراک‌گذاری شماره را دریافت کند.</p>
      </div>
    </div>
    <div className="shrink-0">
      {!loading && !settings ? <Button variant="secondary" size="sm" onClick={() => void load()}>تلاش دوباره</Button> :
        <Toggle label={loading ? 'در حال دریافت…' : saving ? 'در حال ذخیره…' : settings?.require_phone_verification ? 'الزامی' : 'اختیاری'} checked={settings?.require_phone_verification ?? false} disabled={loading || saving || !settings} onChange={(required) => void save(required)} />}
    </div>
  </section>;
}
