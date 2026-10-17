import type { FormEvent } from 'react';
import { Coins, Settings2, Star } from 'lucide-react';
import type { CreateWalletTopupPackRequest } from '@/types';
import { Button, Input, Select } from '@/components/ui';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { StarsAmount } from '@/components/ui/StarsAmount';

export function WalletPackModal({ open, isNew, form, onChange, saving, onClose, onSubmit }: { open: boolean; isNew: boolean; form: CreateWalletTopupPackRequest; onChange: (form: CreateWalletTopupPackRequest) => void; saving: boolean; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <CatalogModal isOpen={open} onClose={onClose} title={isNew ? 'بسته شارژ جدید' : 'ویرایش بسته شارژ'} size="lg" footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>انصراف</Button><Button type="submit" form="wallet-pack-form" loading={saving}>ذخیره بسته</Button></>}>
    <form id="wallet-pack-form" onSubmit={onSubmit}><fieldset disabled={saving} className="space-y-6">
      <div className="customer-offer-preview"><span className="customer-offer-icon"><Coins size={23} /></span><strong><StarsAmount value={form.stars || 0} /></strong></div>
      <CatalogFormSection title="اطلاعات بسته" icon={Coins}><Input label="عنوان بسته" placeholder="مثلاً بسته شروع" required value={form.title} onChange={event => onChange({ ...form, title: event.target.value })} /><Input label="مقدار شارژ" type="number" min="1" max="100000" step="1" required leftIcon={<Star size={16} fill="currentColor" />} value={form.stars || ''} onChange={event => onChange({ ...form, stars: Number(event.target.value) })} /></CatalogFormSection>
      <CatalogFormSection title="نمایش در فروشگاه" icon={Settings2}><div className="customer-form-grid"><Input label="ترتیب نمایش" type="number" min="0" step="1" value={form.sort_order} onChange={event => onChange({ ...form, sort_order: Number(event.target.value) })} /><Select label="وضعیت" value={form.status} onChange={event => onChange({ ...form, status: event.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }]} /></div></CatalogFormSection>
    </fieldset></form>
  </CatalogModal>;
}
