import { useTheme } from '../../features/theme/useTheme'
import { Icon } from '../ui/Icon'

export function ThemeToggle() {
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
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
    </button>
  )
}
