import { useEffect, useState, type CSSProperties } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { useContent } from '../../features/content/ContentProvider'
import { navigationRoutes } from '../../features/content/navigationSettings'
import '../../styles/navigation-themes.css'
import '../../styles/chrome-layout-presets.css'
import { navigationLayoutPresets } from '../../features/content/chromeLayoutPresets'
import { resolveChrome } from '../../features/content/chromePositioning'
import '../../styles/chrome-positioning.css'

export function BottomNavigation() {
  const { navigationSettings: settings } = useContent()
  const location = useLocation()
  const [compact, setCompact] = useState(false)
  const shopActive = location.pathname === '/'
    || location.pathname.startsWith('/products/')
    || location.pathname.startsWith('/categories/')

  useEffect(() => {
    if (!settings.autoCompact) { setCompact(false); return }
    setCompact(false)
  }, [location.pathname, settings.autoCompact])

  useEffect(() => {
    if (!settings.autoCompact) return
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
  }, [settings.autoCompact])

  const items = settings.items.filter(item => item.visible)
  const independent = settings.positioning !== undefined || settings.geometry !== undefined
  const appearance = resolveChrome('navigation', settings)
  const preset = independent ? undefined : navigationLayoutPresets[settings.theme]
  const style: Record<string,string|number> = { '--nav-count': items.length, '--nav-height': settings.height+'px', '--nav-radius': settings.borderRadius+'px', '--nav-item-radius': settings.itemRadius+'px', '--nav-label-size': settings.labelSize+'px' }
  for (const mode of ['light','dark'] as const) for (const [key,value] of Object.entries(settings.colors[mode])) if (value) style['--nav-'+mode+'-'+key] = value
  style['--nav-grid-columns'] = Math.min(3,items.length)
  style['--nav-rows'] = Math.ceil(items.length / 3)

  return (
    <nav className={`bottom-nav chrome-nav ${compact || !settings.labels ? 'is-compact' : ''}`} data-nav-theme={independent ? appearance.theme : settings.theme} data-position={independent ? appearance.positioning : undefined} data-geometry={independent ? appearance.geometry : undefined} data-structure={preset?.family} data-variant={preset?.variant} data-many={items.length > 3} data-crowded={items.length === 6} style={style as CSSProperties} aria-label="ناوبری اصلی">
      {items.map((item,index) => (
        <NavLink
          key={item.page}
          data-group-start={items.length > 1 && index === Math.ceil(items.length / 2)}
          data-group-end={items.length > 1 && index === Math.ceil(items.length / 2)-1}
          to={navigationRoutes[item.page]}
          end={item.page === 'shop'}
          aria-label={item.label}
          style={{ ...(item.color ? { '--nav-item-color': item.color } : {}), ...(item.activeColor ? { '--nav-item-active-color': item.activeColor } : {}) } as CSSProperties}
          className={({ isActive }) => `nav-item ${(item.page === 'shop' ? shopActive : isActive) ? 'active' : ''}`}
        >
          <span className="nav-icon"><Icon name={item.icon} size={settings.iconSize} /></span>
          <span data-nav-label>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
