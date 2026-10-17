import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export interface DashboardMetric {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: 'blue' | 'violet' | 'teal' | 'amber';
  path: string;
}

const item = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export function DashboardMetricCard({ metric, loading }: { metric: DashboardMetric; loading: boolean }) {
  const Icon = metric.icon;
  return <motion.div variants={item}>
    <Link to={metric.path} className={`dashboard-metric dashboard-metric--${metric.tone}`} aria-label={metric.label} aria-busy={loading}>
      <Icon className="dashboard-metric-art" size={100} strokeWidth={1} aria-hidden="true" />
      <div className="dashboard-metric-heading">
        <span className="dashboard-metric-icon"><Icon size={20} aria-hidden="true" /></span>
        <h2>{metric.label}</h2>
      </div>
      <div className="dashboard-metric-value">
        {loading ? <span className="dashboard-metric-skeleton" aria-label="در حال دریافت" /> : <strong>{metric.value.toLocaleString('fa-IR')}</strong>}
        <span className="dashboard-metric-arrow"><ArrowLeft size={17} aria-hidden="true" /></span>
      </div>
    </Link>
  </motion.div>;
}
