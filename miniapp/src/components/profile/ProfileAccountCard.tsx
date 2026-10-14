import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserAccount, VipPlan } from '../../features/commerce/types'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface ProfileAccountCardProps {
  account: UserAccount
  balance: number
  displayName: string
  username?: string
  photoUrl?: string
  activePlan?: VipPlan
}

export function ProfileAccountCard({ account, balance, displayName, username, photoUrl, activePlan }: ProfileAccountCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const vip = account.has_active_plan

  return <section className={`profile-account-card ${vip ? 'has-vip' : ''}`} aria-label="خلاصه حساب">
    <div className="profile-card-cover" aria-hidden="true"><span /><span /><span /></div>
    <div className="profile-account-body">
      <div className="profile-account-identity">
        <div className="profile-photo">
          {photoUrl && failedPhoto !== photoUrl
            ? <img src={photoUrl} alt="" onError={() => setFailedPhoto(photoUrl)} />
            : <span>{Array.from(displayName.trim())[0] || <Icon name="profile" size={32} />}</span>}
        </div>
        <div className="profile-name-block">
          <span className={`profile-account-badge ${vip ? 'is-vip' : ''}`}><Icon name={vip ? 'crown' : 'profile'} size={13} />{vip ? 'VIP فعال' : 'حساب عادی'}</span>
          <h2>{displayName}</h2>
          {username && <p dir="ltr">@{username}</p>}
        </div>
      </div>

      <div className="profile-balance-panel">
        <div className="profile-balance-value"><span><Icon name="wallet" size={15} /><small>موجودی کیف پول</small></span><strong><bdi>{balance.toLocaleString('fa-IR')}</bdi><i aria-hidden="true">⭐</i></strong></div>
        <Link to="/wallet" className="profile-topup-link"><Icon name="plus" size={16} /><span>شارژ حساب</span></Link>
      </div>

      <Link to="/vip" className={`profile-vip-link ${vip ? 'is-active' : ''}`}>
        <span className="profile-vip-symbol"><Icon name="crown" size={21} /></span>
        <span className="profile-vip-copy"><strong>{vip ? activePlan?.title || 'اشتراک VIP' : 'عضویت ویژه'}{vip && <span className="profile-status-dot" aria-hidden="true" />}</strong><small>{vip && account.plan_expire_at ? `فعال تا ${formatDate(account.plan_expire_at)}` : 'دسترسی رایگان به محصولات ویژه'}</small></span>
        <span className="profile-link-arrow"><Icon name="arrow" size={17} /></span>
      </Link>
    </div>
  </section>
}
