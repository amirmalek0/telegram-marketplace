import type { VipPlan, VipQuote } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { Icon } from '../ui/Icon'

export interface VipCheckout { plan: VipPlan; method: 'telegram_stars' | 'wallet'; quote: VipQuote }
interface Props { checkout: VipCheckout; balance: number; preview: boolean; onMethod: (method: VipCheckout['method']) => void; onClose: () => void; onConfirm: () => void }
export function VipCheckoutModal({ checkout, balance, preview, onMethod, onClose, onConfirm }: Props) {
  const { text } = useContent()
  const ref = useDialogFocus(onClose)
  const { quote, plan, method } = checkout
  const insufficient = method === 'wallet' && balance < quote.payable_stars
  return <div className="vip-quote-backdrop" onClick={onClose}><section className="vip-quote-modal membership-checkout" role="dialog" aria-modal="true" aria-labelledby="vip-checkout-title" tabIndex={-1} ref={ref} onClick={event => event.stopPropagation()}>
    <div className="membership-checkout-header"><span><Icon name="crown" size={23} /></span><div><small>{text('membership.review')}</small><h3 id="vip-checkout-title">{plan.title}</h3></div><button type="button" aria-label={text('common.close')} onClick={onClose}>×</button></div>
    <p>{text('membership.days').replace('{days}', plan.duration.toLocaleString('fa-IR'))}</p>
    {quote.is_upgrade && <p className="membership-upgrade-note"><Icon name="info" size={17} />{text('membership.upgrade_hint')}</p>}
    {quote.is_upgrade && quote.current_plan_title && <div className="membership-upgrade-source"><span>{text('membership.current_plan')}</span><b>{quote.current_plan_title}</b></div>}
    <div className="vip-quote-lines"><div><span>قیمت پلن جدید</span><b><bdi>{quote.original_stars.toLocaleString('fa-IR')}</bdi> ⭐</b></div>{quote.is_upgrade && <div><span>اعتبار {quote.remaining_days.toLocaleString('fa-IR')} روز باقی‌مانده</span><b className="quote-credit"><bdi dir="ltr">−{quote.credit_stars.toLocaleString('fa-IR')}</bdi> ⭐</b></div>}<div className="quote-divider" /><div className="quote-total"><span>مبلغ نهایی</span><strong><bdi>{quote.payable_stars.toLocaleString('fa-IR')}</bdi> ⭐</strong></div></div>
    <fieldset className="membership-methods"><legend>{text('membership.payment_method')}</legend>{(['telegram_stars', 'wallet'] as const).map(value => <label key={value} className={method === value ? 'is-selected' : ''}><input type="radio" name="vip-payment-method" checked={method === value} onChange={() => onMethod(value)} /><span className="membership-method-icon"><Icon name={value === 'wallet' ? 'wallet' : 'star'} size={20} /></span><span><b>{text(value === 'wallet' ? 'membership.wallet' : 'membership.stars')}</b><small>{value === 'wallet' ? text('membership.balance').replace('{amount}', balance.toLocaleString('fa-IR')) : text('membership.telegram_payment')}</small></span><span className="membership-method-check" aria-hidden="true">{method === value && <Icon name="check" size={18} />}</span></label>)}</fieldset>
    {insufficient && <p className="vip-quote-warning" role="status">موجودی کیف پول شما برای این پرداخت کافی نیست.</p>}
    {preview && <p className="account-footnote">{text('membership.preview')}</p>}
    <button type="button" className="account-primary membership-confirm" disabled={insufficient || preview} onClick={onConfirm}><Icon name={method === 'wallet' ? 'wallet' : 'star'} size={18} />{text('membership.confirm')}</button>
  </section></div>
}
