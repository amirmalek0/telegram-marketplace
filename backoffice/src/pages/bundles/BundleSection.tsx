import type { ReactNode } from 'react';
import { FileArchive, MessageSquareText, Warehouse } from 'lucide-react';
import { Toggle } from '@/components/ui';

export function BundleSection({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (value: boolean) => void; children: ReactNode }) {
  const Icon = title === 'فایل' ? FileArchive : title === 'پیام' ? MessageSquareText : Warehouse;
  return <section className={`catalog-bundle-section ${enabled ? 'is-enabled' : ''}`}>
    <header><span><Icon size={18} aria-hidden="true" />{title}</span><Toggle checked={enabled} onChange={onToggle} ariaLabel={`افزودن ${title} به باندل`} /></header>
    {enabled && <div className="catalog-bundle-selection">{children}</div>}
  </section>;
}
