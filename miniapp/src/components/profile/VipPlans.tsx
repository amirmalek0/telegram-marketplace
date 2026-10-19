import type { UserAccount, VipPlan } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface Props { account: UserAccount; plans: VipPlan[]; busyKey: string | null; onChoose: (plan: VipPlan, method: 'telegram_stars' | 'wallet') => void; only?: 'overview' | 'plans' }

export function VipPlans({ account, plans, busyKey, onChoose, only }: Props) {
  const { text } = useContent()
  const hasActivePlan = account.has_active_plan && (!account.plan_expire_at || Date.parse(account.plan_expire_at) > Date.now())
  const activePlan = hasActivePlan ? plans.find(plan => plan.id === account.active_plan_id) : undefined
  return <div className="membership-plans">
    {(!only || only === 'overview') && <section className={`membership-overview ${hasActivePlan ? 'is-active' : ''}`}>
      <div className="membership-overview-top"><span className="membership-emblem"><Icon name="crown" size={26} /></span><span className="membership-label">{text('membership.label')}</span>{hasActivePlan && <span className="membership-active"><Icon name="check" size={13} />{text('membership.active')}</span>}</div>
      <h2>{hasActivePlan ? activePlan?.title || text('profile.vip_active') : text('membership.title')}</h2>
      <p>{text('membership.benefit')}</p>
      {hasActivePlan && account.plan_expire_at && <div className="membership-expiry"><Icon name="clock" size={16} /><span>{text('membership.expiry')}</span><strong>{formatDate(account.plan_expire_at)}</strong></div>}
    </section>}
    {(!only || only === 'plans') && <><div className="account-section-title"><span><Icon name="crown" size={17} /><h3>{text('membership.choose')}</h3></span></div>
    {plans.length === 0 ? <div className="account-empty"><Icon name="crown" size={28} /><h3>{text('membership.empty')}</h3><p>{text('membership.empty_hint')}</p></div> : <div className="membership-plan-list">
      {plans.map(plan => {
        const active = hasActivePlan && account.active_plan_id === plan.id
        const upgrade = Boolean(activePlan && plan.tier > activePlan.tier)
        return <article className={`membership-plan ${active ? 'is-active' : ''}`} key={plan.id}>
          <div className="membership-plan-top"><span className="membership-tier"><Icon name="crown" size={14} /><span>{text('membership.tier').replace('{tier}', plan.tier.toLocaleString('fa-IR'))}</span></span>{active && <span className="membership-active"><Icon name="check" size={13} />{text('membership.active')}</span>}</div>
          <h4>{plan.title}</h4>
          <div className="membership-plan-value"><span><Icon name="clock" size={15} /><span>{text('membership.days').replace('{days}', plan.duration.toLocaleString('fa-IR'))}</span></span><strong><bdi>{plan.stars_price.toLocaleString('fa-IR')}</bdi><i aria-label="Stars">⭐</i></strong></div>
          <button type="button" className="account-primary membership-select" disabled={Boolean(busyKey)} aria-busy={busyKey?.startsWith(`quote:${plan.id}:`) || false} onClick={() => onChoose(plan, 'telegram_stars')}><span>{busyKey?.startsWith(`quote:${plan.id}:`) ? text('membership.calculating') : active ? text('membership.renew') : upgrade ? text('membership.upgrade') : text('membership.select')}</span><Icon name={busyKey?.startsWith(`quote:${plan.id}:`) ? 'clock' : 'back'} size={17} /></button>
        </article>
      })}
    </div>}
    {hasActivePlan && <p className="account-footnote"><Icon name="info" size={16} />{text('membership.upgrade_hint')}</p>}
    </>}
  </div>
}
