import { MessageSquareText } from 'lucide-react';
import { Textarea } from '@/components/ui/Textarea';

const variables = [
  { key: '{amount}', label: 'مبلغ اعتبار همین شخص' },
  { key: '{inviter_name}', label: 'نام دعوت‌کننده' },
  { key: '{invitee_name}', label: 'نام فرد دعوت‌شده' },
];

export function validReferralMessage(value: string, other: string) {
  if (!value?.trim() || [...value].length > 2000 || !value.includes('{amount}') || !value.includes(other)) return false;
  if ((value.match(/\{[^{}]*\}/g) || []).some(token => !variables.some(item => item.key === token))) return false;
  return value.replace(/\{(amount|inviter_name|invitee_name)\}/g, (_, key) => key === 'amount' ? '1000000' : '😀'.repeat(100)).length <= 4096;
}

interface Props {
  inviterMessage: string;
  inviteeMessage: string;
  inviterStars: string;
  inviteeStars: string;
  disabled: boolean;
  onChange: (field: 'inviter_message' | 'invitee_message', value: string) => void;
}

export function ReferralMessages({ inviterMessage, inviteeMessage, inviterStars, inviteeStars, disabled, onChange }: Props) {
  const entries = [
    { field: 'inviter_message' as const, title: 'پیام برای دعوت‌کننده', value: inviterMessage, stars: inviterStars, other: '{invitee_name}', example: 'امیر' },
    { field: 'invitee_message' as const, title: 'پیام برای فرد دعوت‌شده', value: inviteeMessage, stars: inviteeStars, other: '{inviter_name}', example: 'سارا' },
  ];
  return <fieldset disabled={disabled} className="mt-5 border-t border-[rgb(var(--color-border))] pt-4">
    <legend className="flex items-center gap-2 px-2 text-sm font-semibold"><MessageSquareText size={17} />پیام دریافت اعتبار در ربات</legend>
    <p className="mb-4 text-xs leading-6 text-[rgb(var(--color-text-secondary))]">دو پیام جداگانه، پس از واریز واقعی پاداش و مطابق شرط انتخاب‌شده ارسال می‌شود. برای پاداش صفر پیامی ارسال نمی‌شود. تغییر متن روی پاداش‌های بعدی اعمال می‌شود، نه پیام‌های قبلاً در صف.</p>
    <div className="mb-4 flex flex-wrap gap-2">{variables.map(item => <span key={item.key} className="rounded-lg border border-[rgb(var(--color-border))] px-2 py-1 text-xs leading-6"><code dir="ltr">{item.key}</code> — {item.label}</span>)}</div>
    <div className="grid gap-5 lg:grid-cols-2">{entries.map(item => {
      const valid = validReferralMessage(item.value, item.other);
      const preview = (item.value || '').replace(/\{(amount|inviter_name|invitee_name)\}/g, (_, key) => key === 'amount' ? (item.stars || '۰') : key === 'inviter_name' ? 'امیر' : 'سارا');
      return <div key={item.field} className="min-w-0 space-y-3">
        <Textarea label={item.title} value={item.value || ''} maxLength={2000} rows={6} onChange={event => onChange(item.field, event.target.value)} error={!valid ? `متن باید شامل {amount} و ${item.other} باشد؛ حداکثر ۲۰۰۰ نویسه و فقط متغیرهای بالا.` : undefined} />
        <div className="flex flex-wrap gap-2">{variables.map(variable => <button type="button" key={variable.key} className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs text-violet-600 dark:text-violet-300 disabled:opacity-40" onClick={() => onChange(item.field, `${item.value || ''} ${variable.key}`)} aria-label={`افزودن ${variable.label} به ${item.title}`}>{variable.label} +</button>)}</div>
        <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3"><p className="mb-2 text-xs text-[rgb(var(--color-text-muted))]">پیش‌نمایش برای {item.example} — بدون ارسال</p><p className="whitespace-pre-wrap break-words text-sm leading-7" dir="auto">{preview}</p></div>
      </div>;
    })}</div>
    <p className="mt-3 text-xs leading-6 text-[rgb(var(--color-text-secondary))]">نام‌ها از حساب تلگرام گرفته می‌شوند. متن ساده است و قالب HTML ندارد. کاربر باید ربات را شروع کرده و آن را مسدود نکرده باشد تا پیام دریافت کند.</p>
  </fieldset>;
}
