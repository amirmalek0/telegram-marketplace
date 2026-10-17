import { BadgeCheck, Clock3, TicketPercent } from 'lucide-react';
import { FinanceSummary } from '@/components/finance/FinanceSummary';
import type { CouponSummary as Summary } from '@/types';

export function CouponSummary({ summary, loading }: { summary: Summary | null; loading: boolean }) {
  return <FinanceSummary label="آمار کدهای تخفیف" loading={loading} items={[
    { label: 'کدهای فعال', value: summary?.active, icon: BadgeCheck, tone: 'green', hint: 'فعال، منقضی‌نشده و دارای ظرفیت استفاده؛ در همه صفحات' },
    { label: 'منقضی‌شده', value: summary?.expired, icon: Clock3, tone: 'amber' },
    { label: 'مجموع کدها', value: summary?.total, icon: TicketPercent, tone: 'blue' },
  ]} />;
}
