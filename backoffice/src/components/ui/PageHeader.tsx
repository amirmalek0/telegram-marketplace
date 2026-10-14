import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps { title: string; action?: ReactNode }
export function PageHeader({ title, action }: PageHeaderProps) {
  return <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="page-heading"><div><h1>{title}</h1></div>{action && <div className="flex shrink-0 items-center gap-2">{action}</div>}</motion.div>;
}
