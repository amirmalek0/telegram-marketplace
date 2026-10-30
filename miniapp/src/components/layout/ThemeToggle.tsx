import { useTheme } from '../../features/theme/useTheme'
import { Icon } from '../ui/Icon'
import type { NavigationIcon } from '../../features/content/navigationSettings'
import { useContent } from '../../features/content/ContentProvider'

export function ThemeToggle({ lightIcon, darkIcon, caption = false }: { lightIcon?: NavigationIcon; darkIcon?: NavigationIcon; caption?: boolean }) {
  const { text } = useContent()
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === 'light' ? 'فعال کردن حالت تیره' : 'فعال کردن حالت روشن'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
    >
      <Icon name={theme === 'light' ? lightIcon ?? 'moon' : darkIcon ?? 'sun'} size={19} />
      {caption && <span className="header-action-caption">{text('header.theme_caption')}</span>}
    </button>
  )
}
