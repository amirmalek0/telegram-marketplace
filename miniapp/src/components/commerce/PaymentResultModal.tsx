import { createPortal } from 'react-dom'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export interface PaymentResult {
  kind: 'success' | 'error' | 'cancelled' | 'pending'
  title: string
  message: string
}

export function PaymentResultModal({ result, onClose }: { result: PaymentResult | null; onClose: () => void }) {
  if (!result) return null
  return <PaymentResultDialog result={result} onClose={onClose} />
}

function PaymentResultDialog({ result, onClose }: { result: PaymentResult; onClose: () => void }) {
  const { text } = useContent()
  const ref = useDialogFocus(onClose)
  return createPortal(
    <div className="payment-result-backdrop" role="presentation" onClick={onClose}>
      <section className={`payment-result-modal is-${result.kind}`} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="payment-result-title" onClick={(event) => event.stopPropagation()}>
        <span className="payment-result-icon"><Icon name={result.kind === 'success' ? 'check' : result.kind === 'pending' ? 'clock' : result.kind === 'cancelled' ? 'info' : 'alert'} size={27} /></span>
        <h3 id="payment-result-title">{result.title}</h3>
        <p>{result.message}</p>
        <button type="button" onClick={onClose}>{text('checkout.payment_done')}</button>
      </section>
    </div>, document.getElementById('miniapp-dialog-root') || document.body
  )
}
