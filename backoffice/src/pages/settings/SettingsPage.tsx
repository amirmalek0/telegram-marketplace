import { useCallback, useEffect, useState } from 'react';
import { Check, FlaskConical, Settings2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentsApi } from '@/api';
import type { PaymentConfigResponse } from '@/types';
import { Badge, Button, ConfirmationModal, Modal } from '@/components/ui';
import { SystemHeader } from '@/components/system/SystemHeader';
import { PhoneVerificationSetting } from './PhoneVerificationSetting';
import { ReferralSettings } from './ReferralSettings';

export default function SettingsPage() {
  const [config, setConfig] = useState<PaymentConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState(false);
  const [pendingMode, setPendingMode] = useState<boolean | null>(null);
  const load = useCallback(async () => { setLoading(true); try { setConfig(await paymentsApi.getConfig()); } catch { toast.error('دریافت تنظیمات ناموفق بود'); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const open = () => { if (!config) return; setSelectedMode(config.test_mode); setModalOpen(true); };
  const requestChange = () => { if (!config || config.test_mode === selectedMode) return setModalOpen(false); setModalOpen(false); setPendingMode(selectedMode); };
  const save = async () => { if (pendingMode === null || saving) return; setSaving(true); try { setConfig(await paymentsApi.updateConfig(pendingMode)); toast.success(pendingMode ? 'حالت آزمایشی سراسری فعال شد' : 'پرداخت واقعی فعال شد'); setPendingMode(null); } catch { toast.error('تغییر تنظیمات ناموفق بود'); } finally { setSaving(false); } };
  const testMode = config?.test_mode ?? false;
  return <div className="system-page">
    <SystemHeader title="تنظیمات عمومی" icon={Settings2} />
    <section className="surface-card system-setting">
      <div className="system-setting-top">
        <span className="system-setting-icon">{testMode ? <FlaskConical size={21} /> : <ShieldCheck size={21} />}</span>
        <div className="system-setting-title"><h2>پرداخت Telegram Stars</h2>{loading ? <span role="status" className="text-xs">در حال دریافت…</span> : config ? <Badge variant={testMode ? 'warning' : 'success'}>{testMode ? 'حالت آزمایشی' : 'پرداخت واقعی'}</Badge> : <span className="text-xs text-rose-500" role="alert">تنظیمات دریافت نشد</span>}</div>
        {!loading && !config ? <Button variant="secondary" size="sm" onClick={() => void load()}>تلاش دوباره</Button> : <Button variant="secondary" size="sm" icon={<Settings2 size={15} />} disabled={loading || !config} onClick={open}>تغییر حالت</Button>}
      </div>
      <div className="system-setting-body"><p>این حالت برای خرید محصول، پلن VIP و شارژ کیف پول اعمال می‌شود.</p><details><summary>نکات پرداخت</summary><p>پرداخت از موجودی داخلی کیف پول فوری است و به تلگرام متصل نمی‌شود. حالت آزمایشی Stars واقعی دریافت نمی‌کند؛ تغییر حالت با تأیید جداگانه انجام می‌شود.</p></details></div>
    </section>
    <PhoneVerificationSetting />
    <ReferralSettings />
    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="حالت پرداخت سراسری" description="حالت فاکتورهای جدید Telegram Stars را انتخاب کنید" size="sm" icon={<Settings2 size={18} />} footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>انصراف</Button><Button disabled={!config || selectedMode === config.test_mode} onClick={requestChange}>ادامه</Button></>}>
      <div className="space-y-3">
        <button type="button" onClick={() => setSelectedMode(false)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right transition-colors ${!selectedMode ? 'border-emerald-500/50 bg-emerald-500/[0.06]' : 'border-[rgb(var(--color-border))]'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><ShieldCheck size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="text-sm">پرداخت واقعی</b>{!selectedMode && <Check size={17} className="text-emerald-500" />}</span><small className="mt-1 block leading-5 text-[rgb(var(--color-text-secondary))]">تلگرام Stars واقعی از کاربر دریافت می‌کند.</small></span></button>
        <button type="button" onClick={() => setSelectedMode(true)} className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right transition-colors ${selectedMode ? 'border-amber-500/50 bg-amber-500/[0.06]' : 'border-[rgb(var(--color-border))]'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500"><FlaskConical size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><b className="text-sm">پرداخت آزمایشی</b>{selectedMode && <Check size={17} className="text-amber-500" />}</span><small className="mt-1 block leading-5 text-[rgb(var(--color-text-secondary))]">نتیجه پرداخت در مینی‌اپ شبیه‌سازی می‌شود و Stars واقعی مصرف نمی‌شود.</small></span></button>
      </div>
    </Modal>
    <ConfirmationModal isOpen={pendingMode !== null} onClose={() => !saving && setPendingMode(null)} onConfirm={() => void save()} title={pendingMode ? 'فعال‌سازی حالت آزمایشی؟' : 'فعال‌سازی پرداخت واقعی؟'} message={pendingMode ? 'همه پرداخت‌های Stars محصول، VIP و شارژ کیف پول قابل شبیه‌سازی می‌شوند و درآمد واقعی ایجاد نمی‌کنند.' : 'همه فاکتورهای جدید Stars واقعی خواهند بود و ممکن است از کاربران مبلغ واقعی کسر شود.'} confirmText="تأیید تغییر سراسری" cancelText="بازگشت" loading={saving} variant="warning" />
  </div>;
}
