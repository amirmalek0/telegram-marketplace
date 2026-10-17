import { Star } from 'lucide-react';
import { cn } from '@/utils/cn';

export function StarsAmount({ value, className }: { value: number; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap font-semibold', className)} aria-label={`${value} Stars`}>
    <span>{value.toLocaleString('fa-IR')}</span>
    <Star size="1em" className="shrink-0 text-amber-600 dark:text-amber-400" fill="currentColor" aria-hidden="true" />
  </span>;
}
