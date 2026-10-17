import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserAccount, VipPlan } from '../../features/commerce/types'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'
import { useContent } from '../../features/content/ContentProvider'
import { useProfilePhoto } from '../../features/commerce/useProfilePhoto'

interface ProfileAccountCardProps {
  account: UserAccount
  balance: number
  displayName: string
  username?: string
  photoUrl?: string
  initDataRaw?: string | null
  activePlan?: VipPlan
}

export function ProfileAccountCard({ account, balance, displayName, username, photoUrl, activePlan, initDataRaw }: ProfileAccountCardProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const { text } = useContent()
  const vip = account.has_active_plan && (!account.plan_expire_at || Date.parse(account.plan_expire_at) > Date.now())
  const safePhoto = useProfilePhoto(photoUrl, initDataRaw)

  return <section className={`profile-account-card ${vip ? 'has-vip' : ''}`} aria-label="خلاصه حساب">
    <div className="profile-account-body">
      <div className="profile-account-identity">
        <div className="profile-photo">
          {safePhoto && failedPhoto !== safePhoto
            ? <img src={safePhoto} alt="" referrerPolicy="no-referrer" onError={() => setFailedPhoto(safePhoto)} />
            : <span>{Array.from(displayName.trim())[0] || <Icon name="profile" size={32} />}</span>}
        </div>
        <div className="profile-name-block">
          <h2>{displayName}</h2>
          {username && <p dir="ltr">@{username}</p>}
          <span className={`profile-account-badge ${vip ? 'is-vip' : ''}`}><Icon name={vip ? 'crown' : 'profile'} size={13} />{vip ? text('profile.vip_active') : text('profile.standard_account')}</span>
        </div>
      </div>

      <div className="profile-balance-panel">
        <Link to="/wallet" className="profile-balance-value"><span><Icon name="wallet" size={16} /><small>{text('profile.wallet_balance')}</small></span><strong><bdi>{balance.toLocaleString('fa-IR')}</bdi><i aria-hidden="true">⭐</i></strong></Link>
        <Link to="/wallet" className="profile-topup-link"><Icon name="plus" size={17} /><span>{text('profile.topup_account')}</span></Link>
      </div>

      <Link to="/vip" className={`profile-vip-link ${vip ? 'is-active' : ''}`}>
        <span className="profile-vip-symbol"><Icon name="crown" size={21} /></span>
        <span className="profile-vip-copy"><strong>{vip ? activePlan?.title || text('profile.vip') : text('profile.special_membership')}</strong><small>{vip && account.plan_expire_at ? text('profile.vip_active_until').replace('{date}', formatDate(account.plan_expire_at)) : text('profile.vip_hint')}</small></span>
        <span className="profile-link-arrow"><Icon name="arrow" size={17} /></span>
      </Link>
    </div>
  </section>
}
