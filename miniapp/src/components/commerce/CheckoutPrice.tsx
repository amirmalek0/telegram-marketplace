import { useContent } from '../../features/content/ContentProvider'
import { useManualPriceState } from '../../features/commerce/useManualPrice'
import { effectiveCheckoutMode, type CheckoutMode, type CheckoutPurpose } from '../../features/commerce/checkoutPresentation'
import { formatToman } from '../../features/commerce/manual'
import { Icon } from '../ui/Icon'

/** Compact catalog price. A quote, not this display, determines the final charge. */
export function CheckoutPrice({ purpose, targetID, stars, starsEnabled, cardEnabled, initDataRaw }: {
  purpose: CheckoutPurpose; targetID: string; stars: number; starsEnabled: boolean; cardEnabled: boolean; initDataRaw?: string | null
}) {
  const { text, editorMode, editorScenario, checkoutPresentation } = useContent()
  const { price, loading, error } = useManualPriceState(purpose, targetID, cardEnabled, initDataRaw, editorMode)
  const scenario = editorMode && /^checkout-(both|stars_first|toman_first)$/.test(editorScenario) ? editorScenario.slice(9) as CheckoutMode : undefined
  const requested = scenario ?? checkoutPresentation[purpose]
  const mode = effectiveCheckoutMode(requested, starsEnabled, price !== null)
  return <span className="checkout-compact-price">
    {starsEnabled && mode !== 'toman_first' && !(loading && requested === 'toman_first') && <span aria-label={text('checkout.stars_price')}><bdi>{stars.toLocaleString('fa-IR')}</bdi><Icon name="star" size={16} /></span>}
    {price !== null && mode !== 'stars_first' && <span aria-label={text('checkout.card_price')}>{formatToman(price)}</span>}
    {loading && requested !== 'stars_first' && <small>{text('checkout.price_loading')}</small>}
    {error && requested !== 'stars_first' && <small>{text('checkout.price_error')}</small>}
  </span>
}
