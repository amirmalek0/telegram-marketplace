import { useId, useRef, useState } from 'react'
import type { CouponQuote } from '../../features/commerce/useProductCoupon'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import '../../styles/coupons.css'

interface Props {
  code: string; quote: CouponQuote | null; checking: boolean; error: string; disabled: boolean
  onChange: (code: string) => void; onApply: () => void; onClear: () => void
}
export function ProductCoupon({ code, quote, checking, error, disabled, onChange, onApply, onClear }: Props) {
  const { text } = useContent()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState(false)
  const isOpen = expanded || Boolean(code || quote || checking || error)
  const close = () => { onClear(); setExpanded(false) }
  return <div className="product-coupon">
    {!isOpen && <button type="button" className="coupon-trigger" disabled={disabled} aria-expanded={false} aria-controls={`${id}-panel`} onClick={() => {
      setExpanded(true)
      requestAnimationFrame(() => {
        inputRef.current?.focus({ preventScroll: true })
        inputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    }}>{text('coupon.title')}</button>}
    <div id={`${id}-panel`} hidden={!isOpen} className="coupon-panel">
    <div className="coupon-panel-heading">
      <span>{text('coupon.placeholder')}</span>
      <button type="button" className="coupon-dismiss" disabled={disabled || checking} onClick={close}>{text(quote ? 'coupon.remove' : 'coupon.close')}</button>
    </div>
    {!quote && <div className="coupon-input-row">
      <input ref={inputRef} id={id} aria-label={text('coupon.title')} value={code} maxLength={64} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={text('coupon.placeholder')} disabled={disabled || checking} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); onApply() } }} aria-invalid={Boolean(error)} aria-describedby={`${id}-status`} />
      <button type="button" disabled={disabled || checking || !code.trim()} onClick={onApply}>{text(checking ? 'coupon.checking' : 'coupon.apply')}</button>
    </div>}
    <div id={`${id}-status`} aria-live="polite">
      {error ? <p className="coupon-error" role="alert">{error}</p> : quote ? <p className="coupon-success"><Icon name="check" size={14} /><span>{text('coupon.applied')} <bdi>{quote.code}</bdi></span></p> : null}
    </div>
    {quote && <dl className="coupon-breakdown">
      <div><dt>{text('coupon.original')}</dt><dd>{quote.original_stars.toLocaleString('fa-IR')} ⭐</dd></div>
      <div className="coupon-discount"><dt>{text('coupon.discount')}</dt><dd>−{quote.discount_stars.toLocaleString('fa-IR')} ⭐</dd></div>
      <div className="coupon-total"><dt>{text('coupon.payable')}</dt><dd>{quote.payable_stars.toLocaleString('fa-IR')} ⭐</dd></div>
    </dl>}
    {!quote && code && <button type="button" className="coupon-clear" disabled={disabled || checking} onClick={close}>{text('coupon.clear')}</button>}
    </div>
  </div>
}
