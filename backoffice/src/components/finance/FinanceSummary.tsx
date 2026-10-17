import type { LucideIcon } from 'lucide-react';
import { StarsAmount } from '@/components/ui/StarsAmount';
import './finance.css';

export interface FinanceMetric { label: string; value?: number; icon: LucideIcon; tone: 'blue' | 'green' | 'amber' | 'violet'; stars?: boolean; hint?: string; }
export function FinanceSummary({ label, items, loading }: { label: string; items: FinanceMetric[]; loading: boolean }) {
  return <section className="finance-summary" aria-label={label} aria-busy={loading}>
    {items.map(({ label: title, value, icon: Icon, tone, stars, hint }) => <div className={`finance-metric finance-metric--${tone}`} key={title} title={hint}>
      <span className="finance-metric-icon"><Icon size={19} aria-hidden="true" /></span>
      <div><h2>{title}</h2><div className="finance-metric-value">{loading ? <span className="finance-skeleton" aria-label="در حال دریافت" /> : value === undefined ? '—' : stars ? <StarsAmount value={value} /> : value.toLocaleString('fa-IR')}</div></div>
    </div>)}
  </section>;
}
