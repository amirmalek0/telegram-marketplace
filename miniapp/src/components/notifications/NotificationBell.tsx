import { Link } from 'react-router-dom'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import type { NavigationIcon } from '../../features/content/navigationSettings'
import '../../styles/notifications.css'

export function NotificationBell({ unread, icon = 'bell', caption = false }: { unread: number; icon?: NavigationIcon; caption?: boolean }) {
  const { text } = useContent()
  return <Link to="/notifications" className="theme-toggle notification-bell" aria-label={text('notifications.title')}>
    <Icon name={icon} size={20} />
    {caption && <span className="header-action-caption">{text('notifications.title')}</span>}
    {unread > 0 && <span className="notification-count" aria-label={text('notifications.unread')}>{unread > 99 ? '۹۹+' : unread.toLocaleString('fa-IR')}</span>}
  </Link>
}
