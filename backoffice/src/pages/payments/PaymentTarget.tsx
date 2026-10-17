import { Crown, Package, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TelegramStarsPaymentResponse } from '@/types';
import { purposeLabels } from './paymentPresentation';

export function PaymentTarget({ payment }: { payment: TelegramStarsPaymentResponse }) {
  const Icon = payment.purpose === 'product' ? Package : payment.purpose === 'vip_plan' ? Crown : Wallet;
  const content = <><Icon size={18} aria-hidden="true" /><span><b>{payment.target_title || purposeLabels[payment.purpose] || 'پرداخت'}</b><small>{purposeLabels[payment.purpose]}{payment.purpose === 'product' && payment.quantity > 0 ? ` · ${payment.quantity.toLocaleString('fa-IR')} عدد` : ''}</small></span></>;
  return payment.purpose === 'product' && payment.product_id ? <Link className="finance-target" to={`/products/${payment.product_id}/edit`}>{content}</Link> : <div className="finance-target">{content}</div>;
}
