import { Icon } from '../ui/Icon'

interface ProductPurchasePanelProps {
  stars: number
  walletBalance?: number
  vipFree: boolean
  purchaseLocked: boolean
  purchasing: boolean
  onPurchase: (method: 'telegram_stars' | 'wallet') => void
  onOpenAccess?: () => void
}

export function ProductPurchasePanel({ stars, walletBalance, vipFree, purchaseLocked, purchasing, onPurchase, onOpenAccess }: ProductPurchasePanelProps) {
  const walletReady = walletBalance !== undefined && walletBalance >= stars

  return <section className={`product-purchase-panel ${vipFree ? 'is-vip' : ''}`}>
    <div className="product-checkout-heading">
      <div className="product-price-copy">
        <small>{vipFree ? 'هدیه اشتراک ویژه' : 'قیمت محصول'}</small>
        <strong>{vipFree ? 'رایگان با VIP' : `${stars.toLocaleString('fa-IR')} ⭐`}</strong>
      </div>
      {purchaseLocked && <span className="product-owned-status"><Icon name="check" size={14} />قبلاً خریداری شده</span>}
    </div>
    <div className="product-checkout-options">
      {purchaseLocked ? <a className="product-owned-link" href="#product-access" onClick={onOpenAccess}>
        <span className="checkout-option-icon"><Icon name="download" size={20} /></span>
        <span className="checkout-option-copy"><b>دسترسی‌های شما</b></span>
        <Icon name="arrow" size={18} />
      </a> : <>
        <button className="stars-payment-button" type="button" aria-busy={purchasing} disabled={purchasing || (!vipFree && stars <= 0)} onClick={() => onPurchase('telegram_stars')}>
          <span className="checkout-option-icon"><Icon name={vipFree ? 'crown' : 'star'} size={20} /></span>
          <span className="checkout-option-copy"><b>{purchasing ? 'در حال اتصال…' : vipFree ? 'دریافت با VIP' : 'پرداخت با Stars'}</b></span>
          <Icon name={purchasing ? 'clock' : 'arrow'} size={18} />
        </button>
        {!vipFree && <button className="wallet-payment-button" type="button" disabled={purchasing || !walletReady} onClick={() => onPurchase('wallet')}>
          <span className="checkout-option-icon"><Icon name="wallet" size={20} /></span>
          <span className="checkout-option-copy">
            <b>خرید از کیف پول</b>
            <span>{walletBalance !== undefined ? `موجودی کیف پول: ${walletBalance.toLocaleString('fa-IR')} ⭐` : 'تحویل امن پس از پرداخت'}</span>
            {walletBalance !== undefined && !walletReady && <small className="checkout-insufficient">موجودی کیف پول ناکافی</small>}
          </span>
          <Icon name="arrow" size={18} />
        </button>}
      </>}
    </div>
  </section>
}
