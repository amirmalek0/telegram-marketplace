import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import type { PaymentResult } from './PaymentResultModal'

interface PaymentStatusNoticeProps {
  kind: PaymentResult['kind']
  message: string
  onDismiss: () => void
}

/** Persistent feedback after the payment dialog closes. */
export function PaymentStatusNotice({ kind, message, onDismiss }: PaymentStatusNoticeProps) {
  const { text } = useContent()
  const title = text(kind === 'pending' ? 'payment.pending_title' : kind === 'success' ? 'payment.success_title' : kind === 'cancelled' ? 'payment.cancelled_title' : 'payment.failed_title')

  return <section className={`payment-status-notice is-${kind}`} dir="rtl">
    <span className="payment-status-notice-icon">
      <Icon name={kind === 'pending' ? 'clock' : kind === 'success' ? 'check' : kind === 'cancelled' ? 'info' : 'alert'} size={23} />
    </span>
    <div className="payment-status-notice-copy" role={kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
    <button type="button" className="payment-status-notice-dismiss" onClick={onDismiss} aria-label={text('common.close')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
    </button>
  </section>
}
