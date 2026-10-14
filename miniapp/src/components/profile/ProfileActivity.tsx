import { Link } from 'react-router-dom'
import type { WalletTransaction } from '../../features/commerce/types'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'

export function ProfileActivity({ transactions }: { transactions: WalletTransaction[] }) {
  const recent = [...transactions].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 2)
  return <section className="profile-activity" aria-labelledby="profile-activity-title">
    <div className="profile-home-heading"><h3 id="profile-activity-title">آخرین گردش‌ها</h3><Link to="/wallet">مشاهده همه<Icon name="arrow" size={14} /></Link></div>
    <div className="profile-activity-list">
      {recent.length ? recent.map(item => {
        const credit = item.balance_after >= item.balance_before
        return <div className="profile-activity-item" key={item.id}>
          <span className={`profile-activity-symbol ${credit ? 'is-credit' : 'is-debit'}`}><Icon name={credit ? 'plus' : 'orders'} size={17} /></span>
          <div><strong>{item.description || 'تراکنش کیف پول'}</strong><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></div>
          <b className={credit ? 'is-credit' : 'is-debit'} dir="ltr">{credit ? '+' : '−'}{item.amount.toLocaleString('fa-IR')} <span aria-hidden="true">⭐</span></b>
        </div>
      }) : <div className="profile-activity-empty"><span><Icon name="clock" size={22} /></span><div><strong>هنوز گردشی ثبت نشده</strong><p>شارژ و خریدهای شما اینجا نمایش داده می‌شود.</p></div></div>}
    </div>
  </section>
}
