import { Trash2 } from 'lucide-react';
import { Badge, Toggle } from '@/components/ui';
import { BankLogo } from './BankLogo';
import type { BankCard } from './types';

export function ManualBankCardEditor({ card, disabled, onChange, onDetect, onRemove }: {
  card: BankCard; disabled: boolean; onChange: (value: Partial<BankCard>) => void; onDetect: () => void; onRemove: () => void;
}) {
  return <article className={`manual-bank-editor ${card.active ? 'is-active' : ''}`}>
    <header><BankLogo bank={card.bank} /><div><strong>{card.bank.name || 'کارت جدید'}</strong><Badge variant={card.active ? 'success' : 'default'}>{card.active ? 'فعال' : 'غیرفعال'}</Badge></div>
      <button type="button" className="manual-icon-button is-danger" disabled={disabled} aria-label={`حذف کارت ${card.owner || 'جدید'} ${card.number.slice(-4)}`} onClick={onRemove}><Trash2 size={17} /></button></header>
    <label htmlFor={`card-number-${card.id}`}>شماره کارت<input id={`card-number-${card.id}`} disabled={disabled} dir="ltr" inputMode="numeric" autoComplete="off" value={card.number} maxLength={23} placeholder="0000 0000 0000 0000" onChange={e => onChange({ number: e.target.value, bank: { key: '', name: '' } })} onBlur={onDetect} /></label>
    <label htmlFor={`card-owner-${card.id}`}>نام صاحب حساب<input id={`card-owner-${card.id}`} disabled={disabled} value={card.owner} maxLength={120} placeholder="نام و نام خانوادگی صاحب کارت" onChange={e => onChange({ owner: e.target.value })} /></label>
    <footer><span>نمایش برای پرداخت‌های جدید</span><Toggle ariaLabel={`فعال بودن کارت ${card.owner || 'جدید'} ${card.number.slice(-4)}`} disabled={disabled} checked={card.active} onChange={active => onChange({ active })} /></footer>
  </article>;
}
