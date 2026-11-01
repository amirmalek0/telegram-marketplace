import type { ManualPriceState } from '../../features/commerce/useManualPrice'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import { PaymentFlow } from '../commerce/PaymentFlow'
import { PaymentArrow } from '../commerce/PaymentArrow'
import type { CouponQuote } from '../../features/commerce/useProductCoupon'
import type { ReactNode } from 'react'

interface ProductPurchasePanelProps {
  targetID: string
  initDataRaw?: string | null
  cardEnabled?: boolean
  manualPriceState?: ManualPriceState
  manualPrice?: number | null
  manualCoupon?: CouponQuote | null
  onManualBusyChange?: (busy: boolean) => void
  onChanged?: () => void
  starsEnabled?: boolean
  stars: number
  walletBalance?: number
  vipFree: boolean
  purchaseLocked: boolean
  purchasing: boolean
  coupon?: ReactNode
  couponFree?: boolean
  checkoutBlocked?: boolean
  cardBlocked?: boolean
  onPurchase: (method: 'telegram_stars' | 'wallet') => void
  onOpenAccess?: () => void
}

export function ProductPurchasePanel({ targetID, initDataRaw, cardEnabled = false, manualPriceState, manualPrice, manualCoupon, onManualBusyChange, onChanged, starsEnabled = true, stars, walletBalance, vipFree, purchaseLocked, purchasing, coupon, couponFree = false, checkoutBlocked = false, cardBlocked = false, onPurchase, onOpenAccess }: ProductPurchasePanelProps) {
  const { text } = useContent()
  const walletReady = walletBalance !== undefined && walletBalance >= stars
  const starsAction = <button className="stars-payment-button" type="button" aria-busy={purchasing} disabled={purchasing || checkoutBlocked || (!vipFree && !couponFree && stars <= 0)} onClick={() => onPurchase('telegram_stars')}>
    <span className="checkout-option-icon"><Icon name={vipFree ? 'crown' : 'star'} size={20} /></span>
    <span className="checkout-option-copy"><b>{text(purchasing ? 'checkout.busy' : vipFree ? 'checkout.free_vip' : couponFree ? 'checkout.free_coupon' : 'checkout.continue_stars')}</b></span>
    {purchasing ? <Icon name="clock" size={18} /> : <PaymentArrow />}
  </button>
  const walletAction = <><button className="wallet-payment-button" type="button" disabled={purchasing || checkoutBlocked || !walletReady} onClick={() => onPurchase('wallet')}>
    <span className="checkout-option-icon"><Icon name="wallet" size={20} /></span>
    <span className="checkout-option-copy"><b>{text('checkout.confirm_wallet')}</b></span>
    <PaymentArrow />
  </button></>
  return <section className={`product-purchase-panel ${vipFree ? 'is-vip' : ''}`}>
    <div className="product-checkout-heading"><div className="product-price-copy"><small><Icon name={vipFree ? 'crown' : 'lucide:credit-card'} size={19} />{text(vipFree ? 'checkout.product_free' : 'checkout.product_title')}</small></div>{purchaseLocked && <span className="product-owned-status"><Icon name="check" size={14} />{text('checkout.owned')}</span>}</div>
    <div className="product-checkout-options">
      {purchaseLocked ? <a className="product-owned-link" href="#product-access" onClick={onOpenAccess}><span className="checkout-option-icon"><Icon name="download" size={20} /></span><span className="checkout-option-copy"><b>{text('checkout.access')}</b></span><Icon name="arrow" size={18} /></a>
      : vipFree || couponFree ? <>{starsAction}{!vipFree && coupon}</>
      : <PaymentFlow purpose="product" targetID={targetID} initDataRaw={initDataRaw} stars={stars} starsEnabled={starsEnabled} cardEnabled={cardEnabled} disabled={purchasing} manualPrice={manualPrice} manualPriceState={manualPriceState} manualCoupon={manualCoupon} manualBlocked={cardBlocked} onManualBusyChange={onManualBusyChange} starsAction={starsAction} walletAction={walletAction} walletBalance={walletBalance} coupon={coupon} onChanged={onChanged} />}
    </div>
  </section>
}
