import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps { eyebrow?: string; title: string; description: string; action?: ReactNode }
export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-heading"><div>{eyebrow && <p className="page-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action && <div className="flex shrink-0 items-center gap-2">{action}</div>}</motion.div>;
}
