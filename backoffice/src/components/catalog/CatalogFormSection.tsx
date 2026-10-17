import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function CatalogFormSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return <section className="catalog-form-section"><h3><Icon size={17} aria-hidden="true" />{title}</h3><div className="space-y-4">{children}</div></section>;
}
