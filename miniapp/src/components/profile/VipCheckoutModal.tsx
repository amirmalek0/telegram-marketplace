import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import type { VipPlan, VipQuote } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { Icon } from '../ui/Icon'

export interface VipCheckout { plan: VipPlan; method: 'telegram_stars' | 'wallet'; quote: VipQuote }
interface Props { starsEnabled?: boolean; checkout: VipCheckout; balance: number; preview: boolean; onMethod: (method: VipCheckout['method']) => void; onClose: () => void; onConfirm: () => void }
export function VipCheckoutModal({ starsEnabled = true, checkout, balance, preview, onMethod, onClose, onConfirm }: Props) {
  const { text } = useContent()
  const ref = useDialogFocus(onClose)
  const [changing, setChanging] = useState(false)
  const { quote, plan, method } = checkout
  const insufficient = method === 'wallet' && balance < quote.payable_stars
  return createPortal(<div className="vip-quote-backdrop" onClick={onClose}><section className="vip-quote-modal membership-checkout" role="dialog" aria-modal="true" aria-labelledby="vip-checkout-title" tabIndex={-1} ref={ref} onClick={event => event.stopPropagation()}>
    <div className="membership-checkout-header"><span><Icon name="crown" size={23} /></span><div><small>{text('checkout.review')}</small><h3 id="vip-checkout-title">{plan.title}</h3></div><button type="button" aria-label={text('common.close')} onClick={onClose}>×</button></div>
    <div className="membership-checkout-body">
      <div className="checkout-selected-item"><span>{text('membership.days').replace('{days}', plan.duration.toLocaleString('fa-IR'))}</span><strong>{text(quote.is_upgrade ? 'membership.upgrade' : 'membership.label')}</strong></div>
      {quote.is_upgrade && <p className="membership-upgrade-note"><Icon name="info" size={17} />{text('membership.upgrade_hint')}</p>}
      {quote.is_upgrade && quote.current_plan_title && <div className="membership-upgrade-source"><span>{text('membership.current_plan')}</span><b>{quote.current_plan_title}</b></div>}
      <div className="vip-quote-lines">
        <div><span>{text('checkout.original_plan')}</span><b><bdi>{quote.original_stars.toLocaleString('fa-IR')}</bdi> ⭐</b></div>
        {quote.is_upgrade && <div><span>{text('checkout.remaining_credit').replace('{days}', quote.remaining_days.toLocaleString('fa-IR'))}</span><b className="quote-credit"><bdi dir="ltr">−{quote.credit_stars.toLocaleString('fa-IR')}</bdi> ⭐</b></div>}
        <div className="quote-total"><span>{text('checkout.final_amount')}</span><strong><bdi>{quote.payable_stars.toLocaleString('fa-IR')}</bdi> ⭐</strong></div>
      </div>
      <div className="membership-review-method"><Icon name={method === 'wallet' ? 'wallet' : 'star'} size={21} /><span><small>{text('checkout.current_method')}</small><b>{text(method === 'wallet' ? 'checkout.wallet_label' : 'checkout.telegram_label')}</b></span><button type="button" aria-expanded={changing} onClick={() => setChanging(value => !value)}>{text('checkout.change_method')}</button></div>
      {changing && <fieldset className="membership-methods"><legend>{text('membership.payment_method')}</legend>{(['telegram_stars', 'wallet'] as const).filter(value => value === 'wallet' || starsEnabled).map(value => <label key={value} className={method === value ? 'is-selected' : ''}><input type="radio" name="vip-payment-method" checked={method === value} onChange={() => { onMethod(value); setChanging(false) }} /><span className="membership-method-icon"><Icon name={value === 'wallet' ? 'wallet' : 'star'} size={20} /></span><span><b>{text(value === 'wallet' ? 'checkout.wallet_label' : 'checkout.telegram_label')}</b><small>{value === 'wallet' ? text('membership.balance').replace('{amount}', balance.toLocaleString('fa-IR')) : text('membership.telegram_payment')}</small></span><span className="membership-method-check" aria-hidden="true">{method === value && <Icon name="check" size={18} />}</span></label>)}</fieldset>}
      {insufficient ? <div className="checkout-shortfall" role="status"><span>{text('checkout.shortfall').replace('{amount}', (quote.payable_stars - balance).toLocaleString('fa-IR'))} ⭐</span><Link to="/wallet" onClick={onClose}>{text('checkout.topup_link')}</Link></div> : <p className="checkout-next-hint">{text(method === 'wallet' ? 'checkout.wallet_next' : 'checkout.telegram_next')}</p>}
      {preview && <p className="account-footnote">{text('membership.preview')}</p>}
    </div>
    <footer className="membership-checkout-footer"><button type="button" className="account-primary membership-confirm" disabled={insufficient || preview || (method === 'telegram_stars' && !starsEnabled)} onClick={onConfirm}><Icon name={method === 'wallet' ? 'wallet' : 'star'} size={18} />{text(method === 'wallet' ? 'checkout.confirm_wallet' : 'checkout.continue_stars')}<bdi>{quote.payable_stars.toLocaleString('fa-IR')}</bdi></button></footer>
  </section></div>, document.getElementById('miniapp-dialog-root') || document.body)
}
