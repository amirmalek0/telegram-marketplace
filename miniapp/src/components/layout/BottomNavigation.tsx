import { NavLink, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'

const navItems: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'فروشگاه', icon: 'shop' },
  { path: '/orders', label: 'سفارش‌ها', icon: 'orders' },
  { path: '/downloads', label: 'دانلودها', icon: 'download' },
  { path: '/tickets', label: 'تیکت‌ها', icon: 'tickets' },
  { path: '/profile', label: 'پروفایل', icon: 'profile' },
]

export function BottomNavigation() {
  const location = useLocation()
  const shopActive = location.pathname === '/'
    || location.pathname.startsWith('/products/')
    || location.pathname.startsWith('/categories/')

  return (
    <nav className="bottom-nav" aria-label="ناوبری اصلی">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item ${(item.path === '/' ? shopActive : isActive) ? 'active' : ''}`}
        >
          <span className="nav-icon"><Icon name={item.icon} size={21} /></span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
