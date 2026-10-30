import type { FormEvent } from 'react';
import { CalendarClock, SlidersHorizontal, Star, TicketPercent, UsersRound } from 'lucide-react';
import type { DiscountType } from '@/types';
import { Input, Select } from '@/components/ui';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { JalaliDateTimePicker } from '@/components/ui/JalaliDateTimePicker';
import { CouponProductSelect } from './CouponProductSelect';
import { CouponUserSelect } from './CouponUserSelect';

export type CouponFormState = { currency_scope: 'stars' | 'toman' | 'both'; toman_discount_type: DiscountType; toman_discount_value: string; code: string; discount_type: DiscountType; discount_value: string; usage_limit: string; expires_at: string; product_ids: string[]; user_ids: string[]; user_scope: 'all' | 'selected' };
export const emptyCouponForm: CouponFormState = { currency_scope: 'stars', toman_discount_type: 'static', toman_discount_value: '', code: '', discount_type: 'percentage', discount_value: '', usage_limit: '0', expires_at: '', product_ids: [], user_ids: [], user_scope: 'all' };

export function CouponForm({ form, onChange, saving, onSubmit }: { form: CouponFormState; onChange: (form: CouponFormState) => void; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  return <form id="coupon-form" onSubmit={onSubmit}><fieldset disabled={saving} className="space-y-6">
    <CatalogFormSection title="کد و مقدار تخفیف" icon={TicketPercent}>
      <Input label="کد تخفیف" dir="ltr" required maxLength={64} value={form.code} onChange={e => onChange({ ...form, code: e.target.value })} placeholder="WELCOME20" />
      <Select label="قیمت مشمول تخفیف" value={form.currency_scope} onChange={e => onChange({ ...form, currency_scope: e.target.value as CouponFormState['currency_scope'] })} options={[{value:'stars',label:'فقط Stars'},{value:'toman',label:'فقط تومان (کارت‌به‌کارت)'},{value:'both',label:'Stars و تومان — مقادیر مستقل'}]} />
      {form.currency_scope !== 'toman' && <div className="grid gap-4 sm:grid-cols-2"><Select label="تخفیف Stars" value={form.discount_type} onChange={e => onChange({ ...form, discount_type: e.target.value as DiscountType })} options={[{ value: 'percentage', label: 'درصدی' }, { value: 'static', label: 'مقدار ثابت (Stars)' }]} />
        <Input label={form.discount_type === 'static' ? 'مقدار تخفیف' : 'مقدار (درصد)'} leftIcon={form.discount_type === 'static' ? <Star size={16} fill="currentColor" /> : <span>٪</span>} type="number" required min={form.discount_type === 'static' ? 1 : 0.01} max={form.discount_type === 'percentage' ? 100 : undefined} step={form.discount_type === 'static' ? 1 : 'any'} value={form.discount_value} onChange={e => onChange({ ...form, discount_value: e.target.value })} placeholder="۲۰" />
      </div>}
      {form.currency_scope !== 'stars' && <div className="grid gap-4 border-t border-slate-200/20 pt-4 sm:grid-cols-2">
        <Select label="تخفیف تومان" value={form.toman_discount_type} onChange={e => onChange({...form,toman_discount_type:e.target.value as DiscountType})} options={[{value:'percentage',label:'درصدی'},{value:'static',label:'مبلغ ثابت (تومان)'}]} />
        <Input label={form.toman_discount_type === 'static' ? 'مقدار تخفیف (تومان)' : 'مقدار تخفیف تومان (درصد)'} type="number" required min={form.toman_discount_type === 'static' ? 1 : 0.01} max={form.toman_discount_type === 'percentage' ? 100 : 1000000000} step={form.toman_discount_type === 'static' ? 1 : 'any'} value={form.toman_discount_value} onChange={e => onChange({...form,toman_discount_value:e.target.value})} />
      </div>}
    </CatalogFormSection>
    <CatalogFormSection title="اعتبار و ظرفیت" icon={CalendarClock}>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="سقف استفاده (۰ = نامحدود)" type="number" min="0" step="1" value={form.usage_limit} onChange={e => onChange({ ...form, usage_limit: e.target.value })} />
        <JalaliDateTimePicker label="تاریخ انقضا" value={form.expires_at} disabled={saving} onChange={expires_at => onChange({ ...form, expires_at })} />
      </div>
    </CatalogFormSection>
    <CatalogFormSection title="محصولات مشمول" icon={SlidersHorizontal}><CouponProductSelect value={form.product_ids} disabled={saving} onChange={product_ids => onChange({ ...form, product_ids })} /></CatalogFormSection>
    <CatalogFormSection title="دسترسی کاربران" icon={UsersRound}><CouponUserSelect scope={form.user_scope} value={form.user_ids} disabled={saving} onScopeChange={user_scope => onChange({ ...form, user_scope })} onChange={user_ids => onChange({ ...form, user_ids })} /></CatalogFormSection>
  </fieldset></form>;
}
