import { useEffect, useRef, useState } from 'react'
import type { UserAccount, VipPlan } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'
import { PaymentFlow } from '../commerce/PaymentFlow'
import { CheckoutPrice } from '../commerce/CheckoutPrice'
import { PaymentArrow } from '../commerce/PaymentArrow'

interface Props { cardEnabled?: boolean; starsEnabled?: boolean; account: UserAccount; plans: VipPlan[]; busyKey: string | null; walletBalance?: number; onChoose: (plan: VipPlan, method: 'telegram_stars' | 'wallet') => void; only?: 'overview' | 'plans'; initDataRaw?: string | null; onChanged?: () => void }

export function VipPlans({ cardEnabled = false, starsEnabled = true, account, plans, busyKey, walletBalance, onChoose, only, initDataRaw, onChanged }: Props) {
  const { text } = useContent()
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const checkoutRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (selectedID) checkoutRef.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }, [selectedID])
  const [manualBusy, setManualBusy] = useState(false)
  const hasActivePlan = account.has_active_plan && (!account.plan_expire_at || Date.parse(account.plan_expire_at) > Date.now())
  const activePlan = hasActivePlan ? plans.find(plan => plan.id === account.active_plan_id) : undefined
  const selected = plans.find(plan => plan.id === selectedID)
  const locked = Boolean(busyKey || manualBusy)
  return <div className="membership-plans">
    {(!only || only === 'overview') && <section className={`membership-overview ${hasActivePlan ? 'is-active' : ''}`}>
      <div className="membership-overview-top"><span className="membership-emblem"><Icon name="crown" size={26} /></span><span className="membership-label">{text('membership.label')}</span>{hasActivePlan && <span className="membership-active"><Icon name="check" size={13} />{text('membership.active')}</span>}</div>
      <h2>{hasActivePlan ? activePlan?.title || text('profile.vip_active') : text('membership.title')}</h2>
      <p>{text('membership.benefit')}</p>
      {hasActivePlan && account.plan_expire_at && <div className="membership-expiry"><Icon name="clock" size={16} /><span>{text('membership.expiry')}</span><strong>{formatDate(account.plan_expire_at)}</strong></div>}
    </section>}
    {(!only || only === 'plans') && <>
      <div className="checkout-stage-heading"><Icon name="crown" size={19} /><h3>{text('checkout.plan_intro')}</h3></div>
      {plans.length === 0 ? <div className="account-empty"><Icon name="crown" size={28} /><h3>{text('membership.empty')}</h3><p>{text('membership.empty_hint')}</p></div> : <div className="membership-choice-list">
        {plans.map(plan => {
          const active = hasActivePlan && account.active_plan_id === plan.id
          const upgrade = Boolean(activePlan && plan.tier > activePlan.tier)
          const chosen = selected?.id === plan.id
          return <button type="button" className={`membership-choice ${active ? 'is-active' : ''} ${chosen ? 'is-selected' : ''}`} key={plan.id} aria-pressed={chosen} disabled={locked} onClick={() => setSelectedID(plan.id)}>
            <span className="membership-choice-icon"><Icon name="crown" size={22} /></span>
            <span className="membership-choice-copy"><span className="membership-choice-title"><b>{plan.title}</b>{active && <span className="membership-active">{text('membership.active')}</span>}</span><small>{text('membership.days').replace('{days}', plan.duration.toLocaleString('fa-IR'))}<span> · </span>{text('membership.tier').replace('{tier}', plan.tier.toLocaleString('fa-IR'))}</small>
              <CheckoutPrice purpose="vip_plan" targetID={plan.id} stars={plan.stars_price} starsEnabled={starsEnabled} cardEnabled={cardEnabled && (!activePlan || active || upgrade)} initDataRaw={initDataRaw} />
            </span>
            <span className="checkout-radio" aria-hidden="true">{chosen && <Icon name="check" size={12} />}</span>
          </button>
        })}
      </div>}
      {selected && <section ref={checkoutRef} className="account-checkout-card" key={selected.id}>
        <div className="checkout-stage-heading"><Icon name="lucide:credit-card" size={19} /><h3>{text('checkout.plan_payment')}</h3></div>
        <div className="checkout-selected-item"><span>{text('checkout.selected_plan')}</span><strong>{selected.title}</strong></div>
        <PaymentFlow purpose="vip_plan" targetID={selected.id} stars={selected.stars_price} starsEnabled={starsEnabled} cardEnabled={cardEnabled && (!activePlan || selected.id === activePlan.id || selected.tier > activePlan.tier)} initDataRaw={initDataRaw} disabled={Boolean(busyKey)} onManualBusyChange={setManualBusy} onChanged={onChanged} walletBalance={walletBalance}
          starsAction={<button type="button" className="account-primary" disabled={locked} aria-busy={Boolean(busyKey)} onClick={() => onChoose(selected, 'telegram_stars')}><Icon name={busyKey ? 'clock' : 'star'} size={19} />{text(busyKey ? 'membership.calculating' : 'checkout.review_plan')}<PaymentArrow size={17} /></button>}
          walletAction={<button type="button" className="account-primary" disabled={locked} onClick={() => onChoose(selected, 'wallet')}><Icon name="wallet" size={19} />{text(busyKey ? 'membership.calculating' : 'checkout.review_plan')}<PaymentArrow size={17} /></button>} />
      </section>}
    </>}
  </div>
}
