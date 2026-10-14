import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'

const navItems: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: 'فروشگاه', icon: 'shop' },
  { path: '/wallet', label: 'کیف پول', icon: 'wallet' },
  { path: '/vip', label: 'VIP', icon: 'crown' },
  { path: '/tickets', label: 'تیکت‌ها', icon: 'tickets' },
  { path: '/profile', label: 'پروفایل', icon: 'profile' },
]

export function BottomNavigation() {
  const location = useLocation()
  const [compact, setCompact] = useState(false)
  const shopActive = location.pathname === '/'
    || location.pathname.startsWith('/products/')
    || location.pathname.startsWith('/categories/')

  useEffect(() => {
    setCompact(false)
  }, [location.pathname])

  useEffect(() => {
    let lastScrollY = Math.max(window.scrollY, 0)
    let animationFrame = 0

    const updateNavigation = () => {
      if (animationFrame) return

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = Math.max(window.scrollY, 0)
        const delta = currentScrollY - lastScrollY

        if (currentScrollY <= 24) {
          setCompact(false)
        } else if (delta > 8) {
          setCompact(true)
        } else if (delta < -8) {
          setCompact(false)
        }

        if (Math.abs(delta) > 8 || currentScrollY <= 24) {
          lastScrollY = currentScrollY
        }
        animationFrame = 0
      })
    }

    window.addEventListener('scroll', updateNavigation, { passive: true })
    return () => {
      window.removeEventListener('scroll', updateNavigation)
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  return (
    <nav className={`bottom-nav ${compact ? 'is-compact' : ''}`} aria-label="ناوبری اصلی">
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
