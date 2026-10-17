import type { FormEvent } from 'react';
import { CalendarClock, SlidersHorizontal, Star, TicketPercent, UsersRound } from 'lucide-react';
import type { DiscountType } from '@/types';
import { Input, Select } from '@/components/ui';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { JalaliDateTimePicker } from '@/components/ui/JalaliDateTimePicker';
import { CouponProductSelect } from './CouponProductSelect';
import { CouponUserSelect } from './CouponUserSelect';

export type CouponFormState = { code: string; discount_type: DiscountType; discount_value: string; usage_limit: string; expires_at: string; product_ids: string[]; user_ids: string[]; user_scope: 'all' | 'selected' };
export const emptyCouponForm: CouponFormState = { code: '', discount_type: 'percentage', discount_value: '', usage_limit: '0', expires_at: '', product_ids: [], user_ids: [], user_scope: 'all' };

export function CouponForm({ form, onChange, saving, onSubmit }: { form: CouponFormState; onChange: (form: CouponFormState) => void; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  return <form id="coupon-form" onSubmit={onSubmit}><fieldset disabled={saving} className="space-y-6">
    <CatalogFormSection title="کد و مقدار تخفیف" icon={TicketPercent}>
      <Input label="کد تخفیف" dir="ltr" required maxLength={64} value={form.code} onChange={e => onChange({ ...form, code: e.target.value })} placeholder="WELCOME20" />
      <div className="grid gap-4 sm:grid-cols-2"><Select label="نوع تخفیف" value={form.discount_type} onChange={e => onChange({ ...form, discount_type: e.target.value as DiscountType })} options={[{ value: 'percentage', label: 'درصدی' }, { value: 'static', label: 'مقدار ثابت (Stars)' }]} />
        <Input label={form.discount_type === 'static' ? 'مقدار تخفیف' : 'مقدار (درصد)'} leftIcon={form.discount_type === 'static' ? <Star size={16} fill="currentColor" /> : <span>٪</span>} type="number" required min={form.discount_type === 'static' ? 1 : 0.01} max={form.discount_type === 'percentage' ? 100 : undefined} step={form.discount_type === 'static' ? 1 : 'any'} value={form.discount_value} onChange={e => onChange({ ...form, discount_value: e.target.value })} placeholder="۲۰" />
      </div>
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
