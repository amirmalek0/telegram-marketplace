import type { FormEvent } from 'react';
import { Crown, Settings2, Star } from 'lucide-react';
import type { CreateVipPlanRequest } from '@/types';
import { Button, Input, Select } from '@/components/ui';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { StarsAmount } from '@/components/ui/StarsAmount';

export function VipPlanModal({ open, isNew, form, onChange, saving, onClose, onSubmit }: { open: boolean; isNew: boolean; form: CreateVipPlanRequest; onChange: (form: CreateVipPlanRequest) => void; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <CatalogModal isOpen={open} onClose={onClose} title={isNew ? 'پلن VIP جدید' : 'ویرایش پلن'} size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>انصراف</Button><Button type="submit" form="vip-plan-form" loading={saving}>ذخیره</Button></>}>
    <form id="vip-plan-form" onSubmit={onSubmit}><fieldset disabled={saving} className="space-y-6">
      <div className="customer-offer-preview"><span className="customer-offer-icon"><Crown size={24} /></span><div className="finance-stack"><strong><StarsAmount value={form.stars_price || 0} /></strong><span className="finance-muted">{form.duration.toLocaleString('fa-IR')} روز · سطح {form.tier.toLocaleString('fa-IR')}</span></div></div>
      <CatalogFormSection title="مشخصات اشتراک" icon={Crown}><Input label="عنوان پلن" placeholder="مثلاً اشتراک طلایی" required maxLength={100} value={form.title} onChange={event => onChange({ ...form, title: event.target.value })} /><div className="customer-form-grid"><Input label="قیمت" type="number" min="1" step="1" required leftIcon={<Star size={16} fill="currentColor" />} value={form.stars_price || ''} onChange={event => onChange({ ...form, stars_price: Number(event.target.value) })} /><Input label="مدت (روز)" type="number" min="1" step="1" required value={form.duration || ''} onChange={event => onChange({ ...form, duration: Number(event.target.value) })} /></div></CatalogFormSection>
      <CatalogFormSection title="سطح و دسترسی" icon={Settings2}><Input label="سطح پلن" hint="پلن با سطح بالاتر، ارتقا محسوب می‌شود." type="number" min="1" step="1" required value={form.tier || ''} onChange={event => onChange({ ...form, tier: Number(event.target.value) })} /><Select label="وضعیت" value={form.status} onChange={event => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }]} /></CatalogFormSection>
    </fieldset></form>
  </CatalogModal>;
}
