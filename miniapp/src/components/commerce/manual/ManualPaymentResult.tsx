import { useContent } from '../../../features/content/ContentProvider'
import { manualStatus, type ManualPayment } from '../../../features/commerce/manual'
import { Icon } from '../../ui/Icon'

export function ManualPaymentResult({ payment, onClose }: { payment: ManualPayment; onClose: () => void }) {
  const { text } = useContent()
  return <div className={`manual-result is-${payment.status}`} role="status">
    <span className="manual-result-symbol"><Icon name={payment.status === 'approved' ? 'check' : payment.status === 'submitted' ? 'clock' : payment.status === 'rejected' ? 'alert' : 'info'} size={30} /></span>
    <h3>{text(('manual.' + payment.status) as 'manual.submitted') || manualStatus[payment.status]}</h3>
    {payment.status === 'submitted' && <strong className="manual-pending-label">{text('manual.pending_label')}</strong>}
    <p data-content-static={Boolean(payment.review_note) && !['submitted', 'approved'].includes(payment.status) || undefined}>{payment.status === 'submitted' ? text('manual.submitted_next') : payment.status === 'approved' ? payment.is_test ? text('manual.approved_test_hint') : payment.toman === 0 && payment.coupon_code ? text('coupon.free_success') : text('manual.approved_hint') : payment.review_note || text('manual.incomplete_hint')}</p>
    {payment.transaction_id && <div className="manual-result-reference"><span>{text('manual.reference')}</span><bdi data-content-static>{payment.transaction_id}</bdi></div>}
    <button type="button" className="manual-primary" onClick={onClose}>{text(payment.status === 'submitted' ? 'manual.close_pending' : 'checkout.payment_done')}</button>
  </div>
}
