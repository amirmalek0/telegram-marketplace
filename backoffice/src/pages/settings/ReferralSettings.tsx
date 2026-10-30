import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gift, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { referralsApi, type ReferralSettings as Settings } from '@/api/referrals';
import { Button, Input, Toggle } from '@/components/ui';
import { Link } from 'react-router-dom';

const triggers: { value: Settings['reward_trigger']; title: string; description: string }[] = [
  { value: 'bot_open', title: 'اولین ورود', description: 'پس از شروع ربات یا ورود به مینی‌اپ با لینک دعوت؛ سریع‌تر ولی مستعد حساب‌های جعلی.' },
  { value: 'phone_verified', title: 'تأیید شماره تلفن', description: 'پس از اشتراک‌گذاری شماره متعلق به حساب تلگرام دعوت‌شده.' },
  { value: 'first_purchase', title: 'اولین خرید موفق', description: 'خرید محصول یا VIP با استار یا کیف پول؛ شارژ کیف پول، دسترسی رایگان و پرداخت شبیه‌سازی‌شده محسوب نمی‌شوند.' },
];

export function ReferralSettings({ phoneVerificationRequired, phoneSaving = false }: { phoneVerificationRequired: boolean | null; phoneSaving?: boolean }) {
  const dirty = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [amounts, setAmounts] = useState({ inviter: '', invitee: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const config = await referralsApi.settings();
      setSaved(config);
      if (!dirty.current) { setDraft(config); setAmounts({ inviter: String(config.inviter_stars), invitee: String(config.invitee_stars) }); }
      else if (phoneVerificationRequired !== true) setDraft(current => current?.reward_trigger === 'phone_verified' ? { ...current, enabled: false } : current);
    } catch { toast.error('دریافت تنظیمات دعوت ناموفق بود'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [phoneVerificationRequired]);
  const validAmount = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) <= 1000000;
  const phoneBlocked = phoneVerificationRequired !== true;
  const selectedBlocked = draft?.reward_trigger === 'phone_verified' && phoneBlocked;
  const valid = validAmount(amounts.inviter) && validAmount(amounts.invitee) && !selectedBlocked && !phoneSaving;
  const next = draft && { ...draft, inviter_stars: Number(amounts.inviter), invitee_stars: Number(amounts.invitee) };
  const changed = JSON.stringify(next) !== JSON.stringify(saved);
  dirty.current = Boolean(draft && changed);
  const save = async () => {
    if (!next || !valid || saving) return;
    setSaving(true);
    try { const config = await referralsApi.save(next); setSaved(config); setDraft(config); toast.success('تنظیمات دعوت ذخیره شد'); }
    catch { toast.error('ذخیره تنظیمات دعوت ناموفق بود؛ وضعیت الزام تأیید شماره را بررسی و دوباره تلاش کنید.'); }
    finally { setSaving(false); }
  };
  return <section className="surface-card system-setting" aria-labelledby="referrals-settings-title">
    <h3 id="referrals-settings-title">
      <button type="button" aria-expanded={expanded} aria-controls="referrals-settings-content" onClick={() => setExpanded(value => !value)} className="flex w-full items-center justify-between gap-4 rounded-xl text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4">
        <span className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-500/10 text-violet-500"><Gift size={20} aria-hidden="true" /></span><span className="text-sm font-bold">دعوت از دوستان</span></span>
        <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-[rgb(var(--color-text-secondary))] transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`} />
      </button>
    </h3>
    <div id="referrals-settings-content" hidden={!expanded}>
    {loading ? <p className="mt-4 text-sm" role="status">در حال دریافت…</p> : !draft ? <Button className="mt-4" variant="secondary" onClick={() => void load()}>تلاش دوباره</Button> : <>
      <div className="mt-4 flex items-center justify-between gap-4 border-t border-[rgb(var(--color-border))] pt-4">
        <span className="text-sm font-semibold">فعال‌سازی دعوت از دوستان</span>
        <Toggle ariaLabel="فعال‌سازی دعوت از دوستان" label={draft.enabled ? 'فعال' : 'غیرفعال'} checked={draft.enabled && !selectedBlocked} disabled={saving || phoneSaving || selectedBlocked} onChange={enabled => setDraft({ ...draft, enabled })} />
      </div>
      <p className="my-4 text-xs leading-6 text-[rgb(var(--color-text-secondary))]">پاداش‌ها به کیف پول داخلی فروشگاه اضافه می‌شوند، نه موجودی تلگرام. هر کاربر جدید فقط یک‌بار و با اولین لینک دعوت واجد شرایط می‌شود.</p>
      <fieldset disabled={saving || phoneSaving} className="grid gap-4 sm:grid-cols-2">
        <Input label="پاداش دعوت‌کننده (استار)" type="number" min={0} max={1000000} step={1} value={amounts.inviter} onChange={e => setAmounts({ ...amounts, inviter: e.target.value })} error={!validAmount(amounts.inviter) ? 'عدد صحیح بین صفر و یک میلیون' : undefined} />
        <Input label="هدیه فرد دعوت‌شده (استار)" type="number" min={0} max={1000000} step={1} value={amounts.invitee} onChange={e => setAmounts({ ...amounts, invitee: e.target.value })} error={!validAmount(amounts.invitee) ? 'عدد صحیح بین صفر و یک میلیون' : undefined} />
      </fieldset>
      <fieldset disabled={saving || phoneSaving} className="mt-5 border-t border-[rgb(var(--color-border))] pt-4">
        <legend className="px-2 text-sm font-semibold">زمان پرداخت پاداش</legend>
        <div className="grid gap-3 lg:grid-cols-3">{triggers.map(trigger => <label key={trigger.value} className={`flex items-start gap-3 rounded-xl border p-3 ${trigger.value === 'phone_verified' && phoneBlocked ? 'cursor-not-allowed bg-[rgb(var(--color-bg))] opacity-60' : 'cursor-pointer'} ${draft.reward_trigger === trigger.value && !(trigger.value === 'phone_verified' && phoneBlocked) ? 'border-violet-500/50 bg-violet-500/5' : 'border-[rgb(var(--color-border))]'}`}>
          <input type="radio" name="referral-trigger" className="mt-1 accent-violet-600" value={trigger.value} disabled={trigger.value === 'phone_verified' && phoneBlocked} aria-describedby={trigger.value === 'phone_verified' && phoneBlocked ? 'referral-phone-disabled-reason' : undefined} checked={draft.reward_trigger === trigger.value && !(trigger.value === 'phone_verified' && phoneBlocked)} onChange={() => setDraft({ ...draft, reward_trigger: trigger.value })} />
          <span><b className="text-sm">{trigger.title}</b><small className="mt-1 block text-xs leading-6 text-[rgb(var(--color-text-secondary))]">{trigger.description}</small></span>
        </label>)}</div>
        {phoneBlocked && <p id="referral-phone-disabled-reason" role="status" className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-7 text-[rgb(var(--color-text-secondary))]">{phoneVerificationRequired === null ? 'ابتدا وضعیت الزام تأیید شماره باید دریافت شود؛ تا آن زمان این روش قابل انتخاب نیست.' : 'این روش غیرفعال است، چون الزام تأیید شماره تلفن خاموش است. برای انتخاب آن، گزینه «تأیید شماره تلفن» در همین صفحه را روشن کنید. پاداش‌های تأیید شماره تا آن زمان پرداخت نمی‌شوند.'}{selectedBlocked && ' شرط قبلی شما حفظ شده و دعوت با این شرط متوقف است؛ برای ادامه، الزام تأیید شماره را روشن کنید یا شرط دیگری انتخاب و تنظیمات دعوت را ذخیره کنید.'}</p>}
      </fieldset>
      <Link className="mt-4 block text-sm text-blue-500" to="/bot-messages">ویرایش متن و دکمه‌های پیام دعوت در بخش پیام‌های ربات ←</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--color-border))] pt-4">
        <p className="max-w-2xl text-xs leading-6 text-[rgb(var(--color-text-secondary))]">مبلغ و شرط جدید فقط برای دعوت‌های بعدی است. غیرفعال‌سازی، ثبت دعوت و پرداخت پاداش‌های در انتظار را متوقف می‌کند؛ با فعال‌سازی دوباره، پاداش‌های واجد شرایط ادامه می‌یابند.</p>
        <Button size="sm" icon={<Save size={15} />} loading={saving} disabled={!valid || !changed} onClick={() => void save()}>ذخیره تنظیمات دعوت</Button>
      </div>
    </>}
    </div>
  </section>;
}
