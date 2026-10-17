import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import '../catalog/catalog.css';
import './system.css';

export function SystemHeader({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children?: ReactNode }) {
  return <header className="catalog-header">
    <div className="catalog-heading"><span className="catalog-heading-icon"><Icon size={23} aria-hidden="true" /></span><h1>{title}</h1></div>
    {children && <div className="catalog-header-actions">{children}</div>}
  </header>;
}
