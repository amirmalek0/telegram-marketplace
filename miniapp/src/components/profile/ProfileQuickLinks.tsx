import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

const links = [
  {
    to: '/orders',
    icon: 'orders' as const,
    title: 'سفارش‌های من',
    description: 'پیگیری خریدها و وضعیت پرداخت',
    tone: 'orders',
  },
  {
    to: '/downloads',
    icon: 'download' as const,
    title: 'دانلودهای من',
    description: 'فایل‌ها و دسترسی‌های خریداری‌شده',
    tone: 'downloads',
  },
]

export function ProfileQuickLinks() {
  return (
    <section className="profile-purchases" aria-labelledby="profile-purchases-title">
      <div className="profile-home-heading"><h3 id="profile-purchases-title">خریدهای شما</h3></div>
      <div className="profile-library">
      {links.map((item) => (
        <Link key={item.to} to={item.to} className={`profile-library-tile is-${item.tone}`}>
          <span className="profile-library-icon"><Icon name={item.icon} size={21} /></span>
          <span className="profile-library-copy">
            <strong>{item.title}</strong>
            <small>{item.description}</small>
          </span>
          <span className="profile-library-arrow"><Icon name="arrow" size={17} /></span>
        </Link>
      ))}
      <Link to="/tickets" className="profile-support-link"><span className="profile-support-icon"><Icon name="tickets" size={18} /></span><span><strong>کنار شما هستیم</strong><small>گفت‌وگو با پشتیبانی</small></span><span className="profile-link-arrow"><Icon name="arrow" size={16} /></span></Link>
      </div>
    </section>
  )
}
