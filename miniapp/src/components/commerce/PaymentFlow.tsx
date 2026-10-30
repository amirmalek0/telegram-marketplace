import { useCallback, useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../../features/content/ContentProvider'
import { effectiveCheckoutMode, type CheckoutMode, type CheckoutPurpose } from '../../features/commerce/checkoutPresentation'
import { selectedPaymentMethod, type CheckoutMethod } from '../../features/commerce/paymentSelection'
import { useManualPriceState, type ManualPriceState } from '../../features/commerce/useManualPrice'
import { formatToman } from '../../features/commerce/manual'
import { ManualPurchaseButton } from './manual/ManualPurchaseButton'
import type { CouponQuote } from '../../features/commerce/useProductCoupon'
import { Icon } from '../ui/Icon'
import '../../styles/payment-flow.css'

interface Props {
  purpose: CheckoutPurpose; targetID: string; stars: number
  starsEnabled: boolean; cardEnabled: boolean; starsAction: ReactNode
  walletAction?: ReactNode; walletBalance?: number; initDataRaw?: string | null; disabled?: boolean
  manualPriceState?: ManualPriceState; manualPrice?: number | null; manualCoupon?: CouponQuote | null; manualBlocked?: boolean
  coupon?: ReactNode; onManualBusyChange?: (busy: boolean) => void
  onChanged?: () => void
}
export function PaymentFlow({ purpose, targetID, stars, starsEnabled, cardEnabled, starsAction, walletAction, walletBalance, initDataRaw, disabled, manualPriceState, manualPrice, manualCoupon, manualBlocked, coupon, onManualBusyChange, onChanged }: Props) {
  const { checkoutPresentation, editorMode, editorScenario, text } = useContent()
  const ownPrice = useManualPriceState(purpose, targetID, cardEnabled && manualPrice === undefined, initDataRaw, editorMode)
  const fetched = manualPriceState ?? ownPrice
  const price = cardEnabled ? manualPrice === undefined ? fetched.price : manualPrice : null
  const scenarioMode = editorMode && /^checkout-(both|stars_first|toman_first)$/.test(editorScenario) ? editorScenario.slice(9) as CheckoutMode : undefined
  const requestedMode = scenarioMode ?? checkoutPresentation[purpose]
  const mode = effectiveCheckoutMode(requestedMode, starsEnabled, price !== null)
  const [choice, setChoice] = useState<{ target: string; method: CheckoutMethod } | null>(null)
  const [manualBusy, setManualBusy] = useState(false)
  const handleManualBusy = useCallback((value: boolean) => { setManualBusy(value); onManualBusyChange?.(value) }, [onManualBusyChange])
  const group = useId()
  const available: CheckoutMethod[] = [
    ...(mode === 'toman_first' ? [price !== null && 'card_to_card', starsEnabled && 'telegram_stars'] : [starsEnabled && 'telegram_stars', price !== null && 'card_to_card']),
    walletAction && 'wallet',
  ].filter(Boolean) as CheckoutMethod[]
  // Do not default to Stars while a Toman-first price is still loading.
  const waitingOnChosenCard = choice?.target === targetID && choice.method === 'card_to_card' && (fetched.loading || fetched.error)
  const selected = waitingOnChosenCard || (fetched.loading && requestedMode !== 'stars_first' && choice?.target !== targetID) ? null
    : selectedPaymentMethod(choice?.target === targetID ? choice.method : null, mode, available)
  const locked = Boolean(disabled || manualBusy)
  const amount = selected === 'card_to_card' ? formatToman(manualCoupon?.payable_stars ?? price ?? 0) : <><bdi>{stars.toLocaleString('fa-IR')}</bdi><Icon name="star" size={22} /></>
  const titles = { telegram_stars: 'checkout.telegram_label', card_to_card: 'checkout.bank_label', wallet: 'checkout.wallet_label' } as const
  const hints = { telegram_stars: 'checkout.telegram_hint', card_to_card: 'checkout.bank_hint', wallet: 'checkout.wallet_hint' } as const
  const nextHints = { telegram_stars: 'checkout.telegram_next', card_to_card: 'checkout.bank_next', wallet: 'checkout.wallet_next' } as const
  const icons = { telegram_stars: 'star', card_to_card: 'lucide:credit-card', wallet: 'wallet' } as const
  return <div className={`payment-flow payment-flow--${mode}`}>
    <fieldset className="checkout-method-picker" disabled={locked}>
      <legend>{text('checkout.how')}</legend>
      <div className="checkout-method-list">
        {available.map(method => <label key={method} className={`checkout-method ${selected === method ? 'is-selected' : ''}`}>
          <input type="radio" name={group} value={method} checked={selected === method} onChange={() => setChoice({ target: targetID, method })} />
          <span className={`checkout-method-symbol is-${method}`}><Icon name={icons[method]} size={21} /></span>
          <span className="checkout-method-copy"><b>{text(titles[method])}</b><small>{method === 'wallet' && walletBalance !== undefined ? <>{text('checkout.balance').replace('{amount}', walletBalance.toLocaleString('fa-IR'))} ⭐</> : text(hints[method])}</small></span>
          <span className="checkout-radio" aria-hidden="true">{selected === method && <Icon name="check" size={12} />}</span>
        </label>)}
      </div>
    </fieldset>
    {fetched.loading && <div className="checkout-price-state" role="status"><span className="checkout-loading-dot" />{text('checkout.price_loading')}</div>}
    {fetched.error && <div className="checkout-price-state is-error" role="status"><span>{text('checkout.price_error')}</span><button type="button" disabled={locked} onClick={fetched.retry}>{text('checkout.retry')}</button></div>}
    {available.length === 0 && !fetched.loading && <p className="checkout-empty" role="status"><Icon name="info" size={18} />{text('checkout.no_methods')}</p>}
    {coupon}
    {!selected && available.length > 0 && <>
      {mode === 'both' && <div className="checkout-price-comparison">
        {starsEnabled && <div><span>{text('checkout.stars_price')}</span><strong><bdi>{stars.toLocaleString('fa-IR')}</bdi><Icon name="star" size={17} /></strong></div>}
        {price !== null && <div><span>{text('checkout.card_price')}</span><strong>{formatToman(manualCoupon?.payable_stars ?? price)}</strong></div>}
      </div>}
      <p className="checkout-select-hint"><Icon name="info" size={16} />{text('checkout.select_hint')}</p>
    </>}
    <div className="checkout-review" hidden={!selected} aria-live="polite">
      {selected && <>
      <div className="checkout-review-total"><span>{text(purpose === 'vip_plan' ? 'checkout.plan_amount' : 'checkout.final_amount')}</span><strong>{amount}</strong></div>
      {purpose === 'vip_plan' && <p className="checkout-next-hint">{text('checkout.plan_quote_hint')}</p>}
      <p className="checkout-next-hint"><Icon name={selected === 'card_to_card' ? 'clock' : 'info'} size={16} /><span>{text(purpose === 'vip_plan' && selected !== 'card_to_card' ? 'checkout.vip_next' : nextHints[selected])}</span></p>
      {selected === 'wallet' && purpose !== 'vip_plan' && walletBalance !== undefined && walletBalance < stars && <div className="checkout-shortfall"><span>{text('checkout.shortfall').replace('{amount}', (stars - walletBalance).toLocaleString('fa-IR'))} ⭐</span><Link to="/wallet">{text('checkout.topup_link')}<Icon name="arrow" size={14} /></Link></div>}
      </>}
      <div className="checkout-primary-action">
        {selected === 'telegram_stars' && starsAction}
        {selected === 'wallet' && walletAction}
        {price !== null && <div hidden={selected !== 'card_to_card'}><ManualPurchaseButton purpose={purpose} targetID={targetID} availablePrice={price} couponQuote={manualCoupon} couponBlocked={manualBlocked} onBusyChange={handleManualBusy} initDataRaw={initDataRaw} disabled={disabled} onChanged={onChanged} /></div>}
      </div>
    </div>
  </div>
}
