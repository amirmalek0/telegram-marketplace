export const paymentStatuses = {
  succeeded: { label: 'موفق', variant: 'success' as const },
  pending: { label: 'در انتظار', variant: 'warning' as const },
  failed: { label: 'ناموفق', variant: 'error' as const },
  refunded: { label: 'بازپرداخت‌شده', variant: 'info' as const },
};
export const paymentStatus = (value: string) => paymentStatuses[value as keyof typeof paymentStatuses] || { label: value, variant: 'default' as const };
export const purposeLabels: Record<string, string> = { product: 'خرید محصول', vip_plan: 'اشتراک VIP', wallet_topup: 'شارژ کیف پول' };
