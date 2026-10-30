import { useId, useRef, useState } from 'react'
import type { CouponQuote } from '../../features/commerce/useProductCoupon'
import type { CouponCurrency } from '../../features/commerce/couponQuotes'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import '../../styles/coupons.css'

interface Props {
  code: string; quote: CouponQuote | null; tomanQuote?: CouponQuote | null
  errors?: Partial<Record<CouponCurrency, string>>
  checking: boolean; error: string; disabled: boolean
  onChange: (code: string) => void; onApply: () => void; onClear: () => void
}
export function ProductCoupon({ code, quote, tomanQuote, errors = {}, checking, error, disabled, onChange, onApply, onClear }: Props) {
  const { text } = useContent()
  const id = useId(), inputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)
  const applied = quote || tomanQuote
  const isOpen = expanded || Boolean(code || applied || checking || error)
  const close = () => { onClear(); setExpanded(false) }
  return <div className="product-coupon">
    {!isOpen && <button type="button" className="coupon-trigger" disabled={disabled} aria-expanded={false} aria-controls={`${id}-panel`} onClick={() => {
      setExpanded(true)
      requestAnimationFrame(() => { inputRef.current?.focus({ preventScroll: true }); inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }) })
    }}>{text('coupon.title')}</button>}
    <div id={`${id}-panel`} hidden={!isOpen} className="coupon-panel">
      <div className="coupon-panel-heading"><span>{text('coupon.title')}</span><button type="button" className="coupon-dismiss" disabled={disabled || checking} onClick={close}>{text(applied ? 'coupon.remove' : 'coupon.close')}</button></div>
      {!applied && <div className="coupon-input-row">
        <input ref={inputRef} id={id} aria-label={text('coupon.title')} value={code} maxLength={64} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={text('coupon.placeholder')} disabled={disabled || checking} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onApply() } }} aria-invalid={Boolean(error || Object.keys(errors).length)} aria-describedby={`${id}-status`} />
        <button type="button" disabled={disabled || checking || !code.trim()} onClick={onApply}>{text(checking ? 'coupon.checking' : 'coupon.apply')}</button>
      </div>}
      <div id={`${id}-status`} aria-live="polite">
        {error && <p className="coupon-error" role="alert">{error}</p>}
        {applied && <p className="coupon-success"><Icon name="check" size={14} /><span>{text('coupon.applied')} <bdi>{applied.code}</bdi></span></p>}
        {(['stars', 'toman'] as const).map(currency => errors[currency] && <p key={currency} className="coupon-error">{text(currency === 'stars' ? 'checkout.stars_price' : 'checkout.card_price')}: {errors[currency]}</p>)}
        {Object.keys(errors).length > 0 && <p className="account-footnote">{text('coupon.remove_for_other_method')}</p>}
      </div>
      {(['stars', 'toman'] as const).map(currency => {
        const value = currency === 'stars' ? quote : tomanQuote
        const unit = currency === 'toman' ? text('coupon.toman_unit') : '⭐'
        return value && <div key={currency} className="coupon-currency-result"><strong>{text(currency === 'stars' ? 'checkout.stars_price' : 'checkout.card_price')}</strong><dl className="coupon-breakdown">
          <div><dt>{text('coupon.original')}</dt><dd>{value.original_stars.toLocaleString('fa-IR')} {unit}</dd></div>
          <div className="coupon-discount"><dt>{text('coupon.discount')}</dt><dd>−{value.discount_stars.toLocaleString('fa-IR')} {unit}</dd></div>
          <div className="coupon-total"><dt>{text('coupon.payable')}</dt><dd>{value.payable_stars.toLocaleString('fa-IR')} {unit}</dd></div>
        </dl></div>
      })}
      {applied && Object.keys(errors).length > 0 && <button type="button" className="coupon-clear" disabled={disabled || checking} onClick={onApply}>{text(checking ? 'coupon.checking' : 'coupon.retry')}</button>}
      {!applied && code && <button type="button" className="coupon-clear" disabled={disabled || checking} onClick={close}>{text('coupon.clear')}</button>}
    </div>
  </div>
}
