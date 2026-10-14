import { Icon } from '../ui/Icon'

export interface PaymentResult {
  kind: 'success' | 'error' | 'cancelled'
  title: string
  message: string
}

export function PaymentResultModal({ result, onClose }: { result: PaymentResult | null; onClose: () => void }) {
  if (!result) return null
  return (
    <div className="payment-result-backdrop" role="presentation" onClick={onClose}>
      <section className={`payment-result-modal is-${result.kind}`} role="dialog" aria-modal="true" aria-labelledby="payment-result-title" onClick={(event) => event.stopPropagation()}>
        <span className="payment-result-icon"><Icon name={result.kind === 'success' ? 'check' : result.kind === 'cancelled' ? 'back' : 'refresh'} size={27} /></span>
        <h3 id="payment-result-title">{result.title}</h3>
        <p>{result.message}</p>
        <button type="button" onClick={onClose}>متوجه شدم</button>
      </section>
    </div>
  )
}
