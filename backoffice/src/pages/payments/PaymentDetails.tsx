import { Clock3, Fingerprint, Package, UserRound } from 'lucide-react';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { Badge } from '@/components/ui';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { StarsAmount } from '@/components/ui/StarsAmount';
import type { TelegramStarsPaymentResponse } from '@/types';
import { OrderCustomer } from '../orders/OrderCustomer';
import { paymentStatus } from './paymentPresentation';
import { PaymentTarget } from './PaymentTarget';

export function PaymentDetails({ payment, onClose }: { payment: TelegramStarsPaymentResponse | null; onClose: () => void }) {
  if (!payment) return null;
  const status = paymentStatus(payment.status);
  const identifiers = [
    ['شناسه پرداخت', payment.id], ['شناسه سفارش', payment.order_id], ['شناسه کاربر', payment.user_id],
    ['شناسه تلگرام', payment.user ? String(payment.user.telegram_id) : undefined],
    ['شناسه محصول', payment.product_id], ['شناسه مقصد پرداخت', payment.target_id],
    ['مرجع پرداخت', payment.checkout_reference], ['شناسه تراکنش تلگرام', payment.external_transaction_id],
    ['شناسه تراکنش ارائه‌دهنده', payment.provider_transaction_id],
  ];
  const dates = [['ایجاد پرداخت', payment.created_at], ['آخرین تغییر', payment.updated_at], ['پرداخت موفق', payment.paid_at], ['بازپرداخت', payment.refunded_at]];
  return <CatalogModal isOpen onClose={onClose} title="جزئیات پرداخت" size="xl">
    <div className="finance-detail-hero"><div className="finance-stack"><span className="finance-muted">مبلغ تراکنش</span><span className="finance-amount"><StarsAmount value={payment.stars} /></span></div>
      <div className="finance-stack"><Badge dot variant={status.variant}>{status.label}</Badge><Badge variant={payment.is_test ? 'warning' : 'default'}>{payment.is_test ? 'آزمایشی · بدون انتقال واقعی' : 'واقعی · Telegram Stars'}</Badge></div>
    </div>
    <div className="finance-detail-grid">
      <section className="finance-detail-section"><h3><UserRound size={16} />پرداخت‌کننده</h3><OrderCustomer user={payment.user} /></section>
      <section className="finance-detail-section"><h3><Package size={16} />بابت پرداخت</h3><PaymentTarget payment={payment} />
        {payment.coupon_code && <div className="finance-stack mt-3"><span className="finance-muted">کد تخفیف</span><CopyIdentifier full value={payment.coupon_code} label="کد تخفیف" /><span className="finance-muted inline-flex items-center gap-1"><StarsAmount value={payment.discount_stars} /> تخفیف</span></div>}
      </section>
      <section className="finance-detail-section finance-wide"><h3><Fingerprint size={16} />شناسه‌ها و پیگیری</h3><dl className="finance-identifiers finance-identifiers-grid">
        {identifiers.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ? <CopyIdentifier value={value} label={label} full /> : <span className="finance-muted">ثبت نشده</span>}</dd></div>)}
      </dl></section>
      <section className="finance-detail-section finance-wide"><h3><Clock3 size={16} />زمان‌بندی</h3><dl className="finance-identifiers finance-identifiers-grid">
        {dates.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ? <time dateTime={value} title={value}>{new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))}</time> : '—'}</dd></div>)}
      </dl></section>
    </div>
  </CatalogModal>;
}
