import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../../../features/content/ContentProvider'
import { ApiClient } from '../../../api/client'
import { type ManualPayment } from '../../../features/commerce/manual'
import { useDialogFocus } from '../../../hooks/useDialogFocus'
import { ManualPaymentSummary } from './ManualPaymentSummary'
import { ManualReceiptField } from './ManualReceiptField'
import { ManualPaymentResult } from './ManualPaymentResult'
import { BankCard } from './BankCard'
import { Icon } from '../../ui/Icon'
import '../../../styles/manual-payment.css'

export function ManualCheckout({ initial, initDataRaw, onClose, onChanged, preview = false, previewState = '' }: { preview?: boolean; previewState?: string; initial: ManualPayment; initDataRaw: string; onClose: (status: string) => void; onChanged?: () => void }) {
  const { text, editorMode } = useContent()
  const isPreview = preview || editorMode
  const [payment, setPayment] = useState(initial), [cardID, setCardID] = useState(initial.destination_card_id || initial.cards[0]?.id || ''), [transaction, setTransaction] = useState(''), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(isPreview && previewState === 'submitting'), [error, setError] = useState(isPreview && previewState === 'error' ? text('manual.submit_error') : ''), [cancelConfirm, setCancelConfirm] = useState(isPreview && previewState === 'cancel-confirm')
  const [step, setStep] = useState<'transfer' | 'proof'>(isPreview && ['receipt', 'submitting', 'error'].includes(previewState) ? 'proof' : 'transfer')
  const selectedCard = payment.cards.find(card => card.id === cardID)
  const [leaving, setLeaving] = useState(false)
  const [sampleReceipt, setSampleReceipt] = useState(isPreview && previewState === 'receipt')
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [payment.status, step])
  const close = () => {
    if (payment.status === 'awaiting_proof' && (step === 'proof' || transaction.trim() || file || sampleReceipt)) { setLeaving(true); return }
    onClose(payment.status)
  }
  const closeRef = useRef(close); closeRef.current = close
  const changedRef = useRef(onChanged); changedRef.current = onChanged
  const ref = useDialogFocus(() => { if (!busy) closeRef.current() })
  useEffect(() => {
    if (isPreview || payment.status !== 'submitted') return
    let active = true, timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      try { if (document.visibilityState === 'visible') { const next = await new ApiClient({ initDataRaw }).get<ManualPayment>(`/payment/manual/checkouts/${payment.id}`); if (active) { setPayment(next); if (next.status !== 'submitted') changedRef.current?.() } } } catch { /* Keep the durable submission visible during a temporary outage. */ }
      if (active) timer = setTimeout(() => void poll(), 5000)
    }
    timer = setTimeout(() => void poll(), 5000)
    return () => { active = false; clearTimeout(timer) }
  }, [payment.id, payment.status, initDataRaw, isPreview])
  const submit = async () => {
    if (busy || !selectedCard || (!transaction.trim() && !file && !sampleReceipt)) return
    if (isPreview) { setPayment({ ...payment, status: 'submitted', transaction_id: transaction }); return }
    setBusy(true); setError('')
    const data = new FormData(); data.set('card_id', cardID); data.set('transaction_id', transaction); if (file) data.set('receipt', file)
    try { setPayment(await new ApiClient({ initDataRaw }).upload<ManualPayment>(`/payment/manual/checkouts/${payment.id}/proof`, data)); changedRef.current?.() } catch (e) { setError(e instanceof Error ? e.message : text('manual.submit_error')) } finally { setBusy(false) }
  }
  const cancel = async () => {
    if (isPreview) { setPayment({ ...payment, status: 'cancelled' }); return }
    setBusy(true); setError('')
    try { await new ApiClient({ initDataRaw }).post(`/payment/manual/checkouts/${payment.id}/cancel`); setPayment({ ...payment, status: 'cancelled' }); changedRef.current?.() } catch (e) { setError(e instanceof Error ? e.message : text('manual.cancel_error')) } finally { setBusy(false) }
  }
  return createPortal(<div className="manual-checkout-backdrop" onClick={() => !busy && close()}>
    <section className="manual-checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="manual-checkout-title" ref={ref} tabIndex={-1} onClick={e => e.stopPropagation()}>
      <header className="manual-checkout-header">
        <span className="manual-method-mark"><Icon name="lucide:credit-card" size={22} /></span>
        <div><h2 id="manual-checkout-title">{text('manual.title')}</h2><span data-content-static>{payment.title}</span></div>
        <button type="button" disabled={busy} onClick={close} aria-label={text('common.close')}><span aria-hidden="true">×</span></button>
      </header>
      <div className="manual-checkout-body" ref={bodyRef}>
        {payment.is_test && <p className="manual-warning"><Icon name="info" size={18} /><span>{text('manual.test_warning')}</span></p>}
        {payment.status !== 'awaiting_proof' && <ManualPaymentSummary payment={payment} />}
        {payment.status === 'awaiting_proof' ? <>
          <ol className="manual-steps"><li className={step === 'transfer' ? 'is-current' : 'is-complete'} aria-current={step === 'transfer' ? 'step' : undefined}><Icon name="lucide:credit-card" size={18} /><span>{text('manual.step_pay')}</span></li><li className={step === 'proof' ? 'is-current' : ''} aria-current={step === 'proof' ? 'step' : undefined}><Icon name="file" size={18} /><span>{text('manual.step_proof')}</span></li><li><Icon name="check" size={18} /><span>{text('manual.step_review')}</span></li></ol>
          {step === 'transfer' ? <>
          <div className="manual-stage-copy"><h3>{text('manual.pay_step')}</h3><p>{text('manual.pay_intro')}</p></div>
          <ManualPaymentSummary payment={payment} />
          <section className="manual-section"><h3>{text('manual.destination')}</h3><div className="manual-cards">{payment.cards.length === 0 && <p className="manual-error" role="alert">{text('manual.no_card')}</p>}{payment.cards.map(card => <BankCard key={card.id} card={card} selected={cardID === card.id} onSelect={() => setCardID(card.id)} />)}</div></section>
          {payment.instructions && <details className="manual-instructions"><summary>{text('manual.instructions_title')}<Icon name="arrow" size={16} /></summary><p data-content-static>{payment.instructions}</p></details>}
          <p className="manual-deadline"><Icon name="clock" size={16} /><span>{text('manual.deadline').replace('{date}', new Date(payment.expires_at).toLocaleString('fa-IR'))}</span></p>
          </> : <>
          <div className="manual-stage-copy"><h3>{text('manual.proof_step')}</h3><p>{text('manual.proof_intro')}</p></div>
          <div className="manual-proof-destination"><span>{text('manual.selected_card')}</span><strong data-content-static>{selectedCard?.owner}</strong><bdi data-content-static>{selectedCard?.number.replace(/(.{4})/g, '$1 ').trim()}</bdi></div>
          <form id="manual-proof-form" className="manual-proof-form" onSubmit={e => { e.preventDefault(); void submit() }}>
            <label>{text('manual.transaction')}<input disabled={busy} inputMode="text" dir="ltr" maxLength={80} value={transaction} placeholder={text('manual.transaction_placeholder')} onChange={e => setTransaction(e.target.value)} /></label>
            <div className="manual-proof-or"><span>{text('manual.either')}</span></div>
            <ManualReceiptField file={file} sampleReceipt={sampleReceipt} disabled={busy} onChange={next => { setFile(next); setSampleReceipt(false) }} onError={setError} />
            <small className="manual-proof-hint">{text('manual.proof_hint')}</small>
          </form>
          </>}
          {error && <p className="manual-error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></p>}
        </> : <ManualPaymentResult payment={payment} onClose={close} />}
      </div>
      {payment.status === 'awaiting_proof' && <footer className="manual-checkout-footer">
        {leaving ? <div className="manual-cancel-confirm" role="alert"><p>{text('manual.unsent_warning')}</p><div><button type="button" onClick={() => setLeaving(false)}>{text('manual.keep_editing')}</button><button type="button" onClick={() => onClose(payment.status)}>{text('manual.leave_unsent')}</button></div></div> : <>
        {step === 'transfer' ? <button type="button" className="manual-primary" disabled={busy || !selectedCard} onClick={() => setStep('proof')}><span>{text('manual.continue_proof')}</span><Icon name="arrow" size={18} /></button> : <>
        <button className="manual-primary" form="manual-proof-form" type="submit" aria-busy={busy} disabled={busy || !selectedCard || (!transaction.trim() && !file && !sampleReceipt)}><Icon name={busy ? 'clock' : 'send'} size={18} />{busy ? text('manual.submitting') : text('manual.submit')}</button>
        </>}
        <div className="manual-footer-tools">
        {step === 'proof' && <button type="button" className="manual-text-action" disabled={busy} onClick={() => setStep('transfer')}>{text('manual.back_to_card')}</button>}
        {!cancelConfirm ? <button type="button" className="manual-text-action" disabled={busy} onClick={() => setCancelConfirm(true)}>{text('manual.cancel')}</button> : <div className="manual-cancel-confirm"><p>{text('manual.cancel_warning')}</p><div><button type="button" disabled={busy} onClick={() => setCancelConfirm(false)}>{text('manual.back')}</button><button type="button" disabled={busy} onClick={() => void cancel()}>{text('manual.cancel_confirm')}</button></div></div>}
        </div>
        </>}
      </footer>}
    </section>
  </div>, document.getElementById('miniapp-dialog-root') || document.body)
}
