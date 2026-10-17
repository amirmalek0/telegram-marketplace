import { Phone } from 'lucide-react';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';

export function CustomerPhone({ value }: { value?: string }) {
  return value?.trim() ? <span className="customer-phone"><Phone size={13} aria-hidden="true" /><CopyIdentifier value={value} label="شماره تلفن" full /></span> : <span className="finance-muted">ثبت نشده</span>;
}
