import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle2, XCircle } from 'lucide-react';
import type { ManualConfig } from './types';
import './manual-notification-settings.css';

const variables = [
  ['user_name', 'نام مشتری'], ['title', 'عنوان خرید'], ['amount_toman', 'مبلغ به تومان'],
  ['payment_id', 'شناسه پرداخت'], ['reason', 'دلیل رد'], ['result', 'نتیجه خرید'],
] as const;
const sample: Record<string, string> = { user_name: 'علی رضایی', title: 'محصول انتخابی', amount_toman: '125000', payment_id: '12345678-abcd-4000-8000-123456789012', reason: 'مبلغ واریزی مطابقت ندارد', result: 'وضعیت تحویل و دسترسی خرید را در صفحه محصول مشاهده کنید.' };

export function ManualNotificationSettings({ config, onChange }: { config: ManualConfig; onChange: (value: Partial<ManualConfig>) => void }) {
  return <section className="manual-notification-settings" aria-labelledby="manual-notification-title">
    <h2 id="manual-notification-title"><MessageSquare size={19} />اعلان‌های مینی‌اپ پس از بررسی</h2>
    <p className="manual-hint">متن اعلان داخل مینی‌اپ را ویرایش کنید. پیام تلگرام از بخش «پیام‌های ربات» مدیریت می‌شود. تغییرات پس از ذخیره، برای بررسی‌های بعدی اعمال می‌شوند؛ پیام‌های قبلی تغییر نمی‌کنند. متن خالی به پیام پیش‌فرض برمی‌گردد.</p>
    <Link className="text-sm text-blue-500" to="/bot-messages">مدیریت متن و دکمه‌های پیام تلگرام ←</Link>
    <div className="manual-field-grid">{(['approval_message', 'rejection_message'] as const).map(key => {
      const approved = key === 'approval_message';
      const value = config[key] || '';
      const preview = value.replace(/\{([^{}]*)\}/g, (token, name: string) => name === 'result' && !approved ? 'پرداخت رد شد.' : name === 'reason' && approved ? '' : sample[name] ?? token);
      const title = approved ? 'پیام تأیید پرداخت' : 'پیام رد پرداخت';
      return <div className="manual-message-editor" key={key}>
        <label htmlFor={key}><span>{approved ? <CheckCircle2 size={17} /> : <XCircle size={17} />}{title}</span></label>
        <textarea id={key} rows={7} maxLength={2000} value={value} placeholder="برای استفاده از پیام پیش‌فرض خالی بگذارید…" onChange={e => onChange({ [key]: e.target.value })} />
        <div className="manual-message-variables" aria-label={`متغیرهای ${title}`}>{variables.filter(([name]) => name !== 'reason' || !approved).map(([name, label]) => <button type="button" key={name} title={`{${name}}`} disabled={value.length + name.length + 3 > 2000} onClick={() => onChange({ [key]: value + (value && !/\s$/.test(value) ? ' ' : '') + `{${name}}` })}>{label}<code>{`{${name}}`}</code></button>)}</div>
        <details className="manual-message-preview"><summary>پیش‌نمایش با اطلاعات نمونه</summary><strong>{approved ? 'پرداخت کارت‌به‌کارت تأیید شد' : 'پرداخت کارت‌به‌کارت رد شد'}</strong><p>{preview || 'پیام پیش‌فرض پس از ذخیره نمایش داده می‌شود.'}{!approved && value && !value.includes('{reason}') ? `\nدلیل بررسی: ${sample.reason}` : ''}</p></details>
      </div>;
    })}</div>
    <p className="manual-hint">عنوان وضعیت و هشدار پرداخت آزمایشی خودکار هستند. اگر متغیر دلیل رد را حذف کنید، دلیل در پایان پیام اضافه می‌شود. پیام‌ها متن ساده‌اند و HTML اجرا نمی‌شود.</p>
  </section>;
}
