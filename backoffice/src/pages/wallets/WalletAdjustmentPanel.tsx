import { Minus, Plus, Sparkles, WalletCards } from 'lucide-react';
import { Input } from '@/components/ui';

export type WalletAdjustmentMode = 'credit' | 'debit';

interface WalletAdjustmentPanelProps {
  balance: number;
  amount: number;
  mode: WalletAdjustmentMode;
  description: string;
  onAmountChange: (amount: number) => void;
  onModeChange: (mode: WalletAdjustmentMode) => void;
  onDescriptionChange: (description: string) => void;
}

const quickAmounts = [10, 25, 50, 100];

export function WalletAdjustmentPanel({
  balance,
  amount,
  mode,
  description,
  onAmountChange,
  onModeChange,
  onDescriptionChange,
}: WalletAdjustmentPanelProps) {
  const signedAmount = mode === 'credit' ? amount : -amount;
  const nextBalance = balance + signedAmount;
  const invalidDebit = mode === 'debit' && amount > balance;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-sky-500/15 bg-gradient-to-l from-sky-500/10 via-blue-500/5 to-transparent p-4">
        <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
            <WalletCards size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[rgb(var(--color-text-secondary))]">موجودی فعلی کاربر</p>
            <strong className="mt-0.5 block text-2xl font-black tracking-tight text-sky-600">
              {balance.toLocaleString('fa-IR')} <span className="text-sm">⭐</span>
            </strong>
          </div>
          <Sparkles size={18} className="text-amber-400" />
        </div>
      </section>

      <section>
        <p className="mb-2 text-xs font-bold text-[rgb(var(--color-text-secondary))]">نوع تغییر موجودی</p>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[rgb(var(--color-surface-2))] p-1.5">
          <button
            type="button"
            onClick={() => onModeChange('credit')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition-all ${
              mode === 'credit'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-[rgb(var(--color-text-secondary))] hover:bg-emerald-500/5 hover:text-emerald-600'
            }`}
          >
            <Plus size={17} strokeWidth={2.5} /> افزایش موجودی
          </button>
          <button
            type="button"
            onClick={() => onModeChange('debit')}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-extrabold transition-all ${
              mode === 'debit'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-[rgb(var(--color-text-secondary))] hover:bg-rose-500/5 hover:text-rose-600'
            }`}
          >
            <Minus size={17} strokeWidth={2.5} /> کاهش موجودی
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]/45 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold">مقدار</p>
            <p className="mt-0.5 text-[10px] text-[rgb(var(--color-text-muted))]">تعداد Stars را بدون علامت وارد کنید</p>
          </div>
          <div dir="ltr" className="flex items-center rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/15">
            <span className={`text-lg font-black ${mode === 'credit' ? 'text-emerald-500' : 'text-rose-500'}`}>{mode === 'credit' ? '+' : '−'}</span>
            <input
              aria-label="مقدار تغییر موجودی"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={amount || ''}
              onChange={event => onAmountChange(Math.max(0, Number(event.target.value)))}
              className="h-12 w-28 bg-transparent px-2 text-center text-xl font-black outline-none"
              placeholder="۰"
            />
            <span className="text-sm">⭐</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2" dir="ltr">
          {quickAmounts.map(value => (
            <button
              key={value}
              type="button"
              onClick={() => onAmountChange(value)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${amount === value
                ? 'border-sky-500 bg-sky-500/10 text-sky-600'
                : 'border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] hover:border-sky-500/40'
              }`}
            >
              {value.toLocaleString('fa-IR')}
            </button>
          ))}
        </div>
      </section>

      <div className={`flex items-center justify-between rounded-xl px-4 py-3 text-xs ${invalidDebit ? 'bg-rose-500/10 text-rose-600' : 'bg-sky-500/8'}`}>
        <span className="font-semibold">موجودی پس از ثبت</span>
        <strong className="text-sm">{Math.max(0, nextBalance).toLocaleString('fa-IR')} ⭐</strong>
      </div>
      {invalidDebit && <p className="-mt-3 text-[11px] font-semibold text-rose-500">مقدار کاهش از موجودی فعلی بیشتر است.</p>}

      <Input
        label="توضیح تغییر"
        value={description}
        onChange={event => onDescriptionChange(event.target.value)}
        placeholder="مثلاً اصلاح موجودی توسط مدیر"
      />
    </div>
  );
}
