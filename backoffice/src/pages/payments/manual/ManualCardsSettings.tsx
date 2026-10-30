import { useEffect, useState } from 'react';
import { AlertCircle, Plus, Save, WalletCards, SlidersHorizontal, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button, ConfirmationModal } from '@/components/ui';
import { Link } from 'react-router-dom';
import type { BankCard, ManualConfig } from './types';
import { ManualBankCardEditor } from './ManualBankCardEditor';
import { ManualNotificationSettings } from './ManualNotificationSettings';

export function ManualCardsSettings({ section }: { section: 'cards' | 'messages' }) {
  const [config, setConfig] = useState<ManualConfig | null>(null);
  const [saved, setSaved] = useState<ManualConfig | null>(null);
  const [removing, setRemoving] = useState<BankCard | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setError(''); const { data } = await apiClient.get<ManualConfig>('/payment/manual/config'); setConfig(data); setSaved(data); } catch { setError('دریافت تنظیمات ناموفق بود'); } };
  useEffect(() => { void load(); }, []);
  const dirty = Boolean(config && saved && JSON.stringify(config) !== JSON.stringify(saved));
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const patch = (id: string, change: Partial<BankCard>) => setConfig(c => c && ({ ...c, cards: c.cards.map(card => card.id === id ? { ...card, ...change } : card) }));
  const detect = async (id: string, number: string) => {
    if (!number.trim()) return;
    try {
      const { data } = await apiClient.post('/payment/manual/bank', { number });
      setConfig(c => c && ({ ...c, cards: c.cards.map(card => card.id === id && card.number === number ? { ...card, number: data.number, bank: data.bank } : card) }));
    } catch { toast.error('شماره کارت معتبر و متعلق به بانک ایرانی وارد کنید'); }
  };
  const save = async () => {
    if (!config || busy || !dirty) return;
    if (config.mode === 'fixed' && !config.cards.some(card => card.id === config.fixed_card_id && card.active)) return toast.error('یک کارت فعال را به‌عنوان کارت ثابت انتخاب کنید');
    setBusy(true);
    try { const { data } = await apiClient.put<ManualConfig>('/payment/manual/config', config); setConfig(data); setSaved(data); toast.success('تنظیمات کارت‌به‌کارت ذخیره شد'); }
    catch (e: any) { toast.error(e.response?.data?.error || 'ذخیره ناموفق بود'); }
    finally { setBusy(false); }
  };
  if (!config) return <section className="surface-card manual-empty" role={error ? 'alert' : 'status'}><AlertCircle size={28} /><strong>{error || 'در حال دریافت تنظیمات…'}</strong>{error && <Button onClick={() => void load()}>تلاش دوباره</Button>}</section>;
  const activeCount = config.cards.filter(card => card.active).length;
  return <div className="manual-config-workspace">
    <div hidden={section !== 'cards'}>
      <p className="mb-4 text-sm text-[rgb(var(--color-text-secondary))]">فعال یا غیرفعال کردن روش پرداخت از <Link className="font-semibold text-blue-600 underline" to="/payments/checkout-settings">تنظیمات پرداخت</Link> انجام می‌شود.</p>
      <fieldset disabled={busy} className="surface-card manual-settings">
        <div className="manual-section-title"><h2><WalletCards size={20} />کارت‌های مقصد <span className="manual-count">{activeCount.toLocaleString('fa-IR')} فعال / {config.cards.length.toLocaleString('fa-IR')}</span></h2>
          <Button variant="secondary" size="sm" disabled={config.cards.length >= 30} icon={<Plus size={16} />} onClick={() => setConfig({ ...config, cards: [...config.cards, { id: crypto.randomUUID(), number: '', owner: '', bank: { key: '', name: '' }, active: true }] })}>افزودن کارت</Button></div>
        {config.cards.length === 0 ? <div className="manual-empty"><WalletCards size={32} /><strong>هنوز کارت مقصدی ندارید</strong><p>برای شروع، شماره کارت و نام صاحب حساب را اضافه کنید.</p></div> : <div className="manual-bank-grid">{config.cards.map(card => <ManualBankCardEditor key={card.id} card={card} disabled={busy} onChange={change => patch(card.id, change)} onDetect={() => void detect(card.id, card.number)} onRemove={() => setRemoving(card)} />)}</div>}
        <section className="manual-config-section"><h2><SlidersHorizontal size={19} />نحوه نمایش کارت‌ها</h2>
          <div className="manual-mode-options" role="group" aria-label="نحوه نمایش کارت‌ها">{[
            ['random', 'انتخاب تصادفی', 'یک کارت برای هر پرداخت'], ['fixed', 'کارت مشخص', 'همیشه یک مقصد ثابت'], ['multiple', 'انتخاب مشتری', 'نمایش همه کارت‌های فعال'],
          ].map(([mode, title, hint]) => <button type="button" key={mode} aria-pressed={config.mode === mode} onClick={() => setConfig({ ...config, mode: mode as ManualConfig['mode'] })}><b>{title}</b><span>{hint}</span></button>)}</div>
          {config.mode === 'fixed' && <label htmlFor="manual-fixed-card">کارت ثابت<select id="manual-fixed-card" value={config.fixed_card_id} onChange={e => setConfig({ ...config, fixed_card_id: e.target.value })}><option value="">انتخاب کارت فعال</option>{config.cards.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.owner} — {c.number.slice(-4)}</option>)}</select></label>}
          {activeCount === 0 && <p className="manual-caution"><AlertCircle size={17} />بدون کارت فعال، پرداخت کارت‌به‌کارت در دسترس مشتری نیست.</p>}
        </section>
        <section className="manual-config-section"><h2><FileText size={19} />راهنمای واریز</h2><label htmlFor="manual-instructions" className="sr-only">راهنمای واریز مشتری</label><textarea id="manual-instructions" rows={4} maxLength={4000} value={config.instructions} placeholder="دستورالعمل واریز و زمان بررسی پرداخت…" onChange={e => setConfig({ ...config, instructions: e.target.value })} />
          <p className="manual-hint">تغییر کارت‌ها و راهنما فقط برای پرداخت‌های جدید است. تشخیص بانک، مالکیت حساب را تأیید نمی‌کند.</p></section>
      </fieldset>
    </div>
    <fieldset disabled={busy} hidden={section !== 'messages'} className="surface-card manual-settings manual-messages-panel"><ManualNotificationSettings config={config} onChange={changes => setConfig({ ...config, ...changes })} /></fieldset>
    <footer className="manual-save-bar"><span className={dirty ? 'is-dirty' : ''}>{dirty ? 'تغییرات ذخیره‌نشده' : 'همه تغییرات ذخیره شده‌اند'}</span><div><Button variant="secondary" disabled={!dirty || busy} onClick={() => setConfig(saved)}>لغو تغییرات</Button><Button disabled={!dirty || busy} loading={busy} icon={<Save size={16} />} onClick={() => void save()}>ذخیره تنظیمات</Button></div></footer>
    <ConfirmationModal isOpen={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={() => { if (!removing) return; setConfig(c => c && ({ ...c, fixed_card_id: c.fixed_card_id === removing.id ? '' : c.fixed_card_id, cards: c.cards.filter(card => card.id !== removing.id) })); setRemoving(null); }} title="حذف کارت مقصد؟" message="این کارت از پرداخت‌های جدید حذف می‌شود. اطلاعات واریزهای قبلی حفظ خواهد شد. برای اعمال حذف، تنظیمات را ذخیره کنید." confirmText="حذف از فهرست" />
  </div>;
}
