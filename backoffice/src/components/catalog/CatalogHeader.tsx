import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import './catalog.css';

export function CatalogHeader({ title, icon: Icon, total, loading, actions }: {
  title: string; icon: LucideIcon; total: number; loading: boolean; actions: ReactNode;
}) {
  return <header className="catalog-header">
    <div className="catalog-heading"><span className="catalog-heading-icon"><Icon size={23} aria-hidden="true" /></span><h1>{title}</h1><span className="catalog-total" aria-label={`مجموع: ${total}`}>
      {loading ? '…' : total.toLocaleString('fa-IR')}
    </span></div>
    <div className="catalog-header-actions">{actions}</div>
  </header>;
}
