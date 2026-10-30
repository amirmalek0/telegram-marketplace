import { useContent } from '../../../features/content/ContentProvider'
import { formatToman, type ManualPayment } from '../../../features/commerce/manual'
import { Icon } from '../../ui/Icon'

export function ManualPaymentSummary({ payment }: { payment: ManualPayment }) {
  const { text } = useContent()
  return <>
    <div className="manual-checkout-amount">
      <span>{text(payment.status === 'awaiting_proof' ? 'manual.amount' : 'manual.result_amount')}</span><strong>{formatToman(payment.toman)}</strong>
      {payment.status === 'awaiting_proof' && <small><Icon name="clock" size={14} />{text(payment.toman === 0 && payment.coupon_code ? 'coupon.free_success' : 'manual.review_hint')}</small>}
    </div>
    {!!payment.discount_toman && <dl className="coupon-breakdown">
      <div><dt>{text('coupon.original')}</dt><dd>{formatToman(payment.original_toman)}</dd></div>
      <div className="coupon-discount"><dt>{text('coupon.discount')} <bdi>{payment.coupon_code}</bdi></dt><dd>−{formatToman(payment.discount_toman)}</dd></div>
      <div className="coupon-total"><dt>{text('coupon.payable')}</dt><dd>{formatToman(payment.toman)}</dd></div>
    </dl>}
    {payment.credit_toman > 0 && <div className="manual-upgrade-breakdown">
      <strong><Icon name="crown" size={16} />{text('manual.upgrade')}</strong>
      <p>{text('manual.original').replace('{amount}', formatToman(payment.original_toman))}</p>
      <p className="manual-credit">{text('manual.credit').replace('{days}', payment.remaining_days.toLocaleString('fa-IR')).replace('{amount}', formatToman(payment.credit_toman))}</p>
      <p>{text('manual.total').replace('{amount}', formatToman(payment.toman))}</p>
      <small>{text('manual.upgrade_hint')}</small>
    </div>}
    {payment.wallet_stars > 0 && <p className="manual-wallet-note"><Icon name="wallet" size={18} /><span>{text('manual.wallet_hint').replace('{stars}', payment.wallet_stars.toLocaleString('fa-IR'))}</span></p>}
  </>
}
