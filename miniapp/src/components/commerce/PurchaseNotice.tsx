import { Icon } from '../ui/Icon'

interface PurchaseNoticeProps {
  tone: 'info' | 'success' | 'error'
  children: string
}

export function PurchaseNotice({ tone, children }: PurchaseNoticeProps) {
  return <div className={`product-purchase-notice is-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
    <span className="purchase-notice-icon"><Icon name={tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'info'} size={19} /></span>
    <p>{children}</p>
  </div>
}
