import type { UserAccount, VipPlan } from '../../features/commerce/types'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface VipPlansProps {
  account: UserAccount
  plans: VipPlan[]
  busyKey: string | null
  onChoose: (plan: VipPlan, method: 'telegram_stars' | 'wallet') => void
}

export function VipPlans({ account, plans, busyKey, onChoose }: VipPlansProps) {
  const activePlan = plans.find((plan) => plan.id === account.active_plan_id)

  return <section className="vip-card">
    <div className="vip-overview">
      <span><Icon name="crown" size={24} /></span>
      <div><small>عضویت ویژه</small><h3>پلن‌های VIP</h3><p>{account.has_active_plan && account.plan_expire_at ? `پلن شما تا ${formatDate(account.plan_expire_at)} فعال است` : 'دسترسی رایگان به محصولات ویژه'}</p></div>
    </div>
    <div className="vip-plan-list">
      {plans.map((plan) => {
        const active = account.has_active_plan && account.active_plan_id === plan.id
        const upgrade = Boolean(activePlan && plan.tier > activePlan.tier)
        return <article className={`vip-plan ${active ? 'is-active' : ''}`} key={plan.id}>
          <div className="vip-plan-rank"><Icon name="crown" size={16} /><span>سطح {plan.tier.toLocaleString('fa-IR')}</span>{active && <b><Icon name="check" size={13} />پلن فعال</b>}</div>
          <div className="vip-plan-copy"><h4>{plan.title}</h4><p>{plan.duration.toLocaleString('fa-IR')} روز دسترسی ویژه</p>{active && account.plan_expire_at && <small>تاریخ انقضا: {formatDate(account.plan_expire_at)}</small>}</div>
          <strong className="vip-plan-price">{plan.stars_price.toLocaleString('fa-IR')} <i>⭐</i></strong>
          <div className="vip-plan-actions">
            <button disabled={Boolean(busyKey)} aria-busy={busyKey === `quote:${plan.id}:telegram_stars`} onClick={() => onChoose(plan, 'telegram_stars')}>{active ? 'تمدید با Stars' : upgrade ? 'ارتقا با Stars' : 'پرداخت با Stars'}<Icon name={busyKey === `quote:${plan.id}:telegram_stars` ? 'clock' : 'arrow'} size={16} /></button>
            <button className="wallet-buy" disabled={Boolean(busyKey)} aria-busy={busyKey === `quote:${plan.id}:wallet`} onClick={() => onChoose(plan, 'wallet')}><Icon name="wallet" size={16} />{active ? 'تمدید با کیف پول' : upgrade ? 'ارتقا با کیف پول' : 'خرید از کیف پول'}</button>
          </div>
        </article>
      })}
    </div>
  </section>
}
