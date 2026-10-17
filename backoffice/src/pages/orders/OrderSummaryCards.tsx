import { CheckCheck, Clock3, ShoppingBag, WalletCards } from 'lucide-react';
import { FinanceSummary } from '@/components/finance/FinanceSummary';
import type { OrdersSummary } from '@/types';

export function OrderSummaryCards({ summary, loading }: { summary: OrdersSummary | null; loading: boolean }) {
  return <FinanceSummary label="آمار سفارش‌ها" loading={loading} items={[
    { label: 'کل سفارش‌ها', value: summary?.total, icon: ShoppingBag, tone: 'blue' },
    { label: 'در انتظار پرداخت', value: summary?.pending, icon: Clock3, tone: 'amber' },
    { label: 'پرداخت‌شده', value: summary?.paid, icon: CheckCheck, tone: 'green' },
    { label: 'مبلغ پرداخت‌شده', value: summary?.paid_stars, icon: WalletCards, tone: 'violet', stars: true },
  ]} />;
}
