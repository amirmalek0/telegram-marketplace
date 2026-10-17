import { Minus, Plus, Star, WalletCards } from 'lucide-react';
import { Input } from '@/components/ui';
import { StarsAmount } from '@/components/ui/StarsAmount';

export type WalletAdjustmentMode = 'credit' | 'debit';
interface WalletAdjustmentPanelProps {
  balance: number; amount: number; mode: WalletAdjustmentMode; description: string;
  onAmountChange: (amount: number) => void; onModeChange: (mode: WalletAdjustmentMode) => void; onDescriptionChange: (description: string) => void;
}
const quickAmounts = [10,25,50,100];
export function WalletAdjustmentPanel({ balance, amount, mode, description, onAmountChange, onModeChange, onDescriptionChange }: WalletAdjustmentPanelProps) {
  const nextBalance = balance + (mode === 'credit' ? amount : -amount);
  const invalidDebit = mode === 'debit' && amount > balance;
  return <div className="space-y-5">
    <div className="customer-offer-preview"><span className="inline-flex items-center gap-2 text-xs"><WalletCards size={18} />موجودی فعلی کاربر</span><strong><StarsAmount value={balance} /></strong></div>
    <div className="customer-tabs w-full" role="group" aria-label="نوع تغییر موجودی">
      <button type="button" className="flex-1" aria-pressed={mode === 'credit'} onClick={() => onModeChange('credit')}><Plus size={16} />افزایش موجودی</button>
      <button type="button" className="flex-1" aria-pressed={mode === 'debit'} onClick={() => onModeChange('debit')}><Minus size={16} />کاهش موجودی</button>
    </div>
    <Input label="مقدار تغییر موجودی" type="number" min="1" step="1" required inputMode="numeric" value={amount || ''} onChange={event => onAmountChange(Number(event.target.value))} placeholder="۰" leftIcon={<Star size={16} fill="currentColor" />} hint="مقدار را بدون علامت، به‌صورت عدد صحیح وارد کنید." />
    <div className="flex flex-wrap gap-2" role="group" aria-label="مقادیر پیشنهادی">{quickAmounts.map(value => <button key={value} type="button" onClick={() => onAmountChange(value)} aria-pressed={amount === value} className={`rounded-lg border px-3 py-2 text-xs ${amount === value ? 'border-blue-500 bg-blue-500/5 text-blue-600' : 'border-[rgb(var(--color-border))]'}`}>{value.toLocaleString('fa-IR')}</button>)}</div>
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-xs ${invalidDebit ? 'border-rose-500/25 text-rose-600' : 'border-[rgb(var(--color-border))]'}`} aria-live="polite"><span>موجودی پس از ثبت</span><StarsAmount value={nextBalance} /></div>
    {invalidDebit && <p role="alert" className="text-xs text-rose-500">مقدار کاهش از موجودی فعلی بیشتر است.</p>}
    <Input label="توضیح تغییر" value={description} onChange={event => onDescriptionChange(event.target.value)} placeholder="علت اصلاح موجودی" />
  </div>;
}
