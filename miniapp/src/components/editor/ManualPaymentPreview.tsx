import { useContent } from '../../features/content/ContentProvider'
import { useState } from 'react'
import { ManualCheckout } from '../commerce/manual/LazyManualCheckout'
import { manualPreviewPayment, parseManualScenario } from '../../features/content/manualPreview'

export function ManualPaymentPreview({ scenario }: { scenario: string }) {
  const { text } = useContent()
  const [closed, setClosed] = useState(false)
  const spec = parseManualScenario(scenario)
  if (!spec || closed) return null
  if (spec.state === 'loading') return <p role="status">{text('manual.form_loading')}</p>
  return <ManualCheckout preview previewState={spec.state} initial={manualPreviewPayment(spec.purpose, spec.state)} initDataRaw="" onClose={() => setClosed(true)} />
}
