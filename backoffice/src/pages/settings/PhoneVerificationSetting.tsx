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
  return <section className="surface-card system-setting">
    <div className="system-setting-top">
      <span className="system-setting-icon"><Phone size={21} /></span>
      <div className="system-setting-title"><h2>تأیید شماره تلفن</h2><span className="text-xs text-[rgb(var(--color-text-secondary))]">دسترسی به مینی‌اپ و API</span></div>
    <div className="shrink-0">
      {!loading && !settings ? <Button variant="secondary" size="sm" onClick={() => void load()}>تلاش دوباره</Button> :
        <Toggle ariaLabel="الزام تأیید شماره تلفن" label={loading ? 'در حال دریافت…' : saving ? 'در حال ذخیره…' : settings?.require_phone_verification ? 'الزامی' : 'اختیاری'} checked={settings?.require_phone_verification ?? false} disabled={loading || saving || !settings} onChange={(required) => void save(required)} />}
    </div>
    </div>
    <div className="system-setting-body"><p>در حالت الزامی، دسترسی کاربران تا اشتراک‌گذاری شماره حساب تلگرام متوقف می‌شود.</p><details><summary>نکات تأیید شماره</summary><p>این تنظیم بلافاصله برای کاربران فعلی و جدید اعمال می‌شود. شماره واردشده توسط مدیر تأییدشده محسوب نمی‌شود. ربات باید روشن باشد تا شماره اشتراک‌گذاری‌شده را دریافت کند.</p></details></div>
  </section>;
}
