import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const themeStorageKey = 'telegram-marketplace-theme'

function readStoredTheme(): ThemeMode {
  try {
    return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0d0d0f' : '#f5f5f7')

    try {
      localStorage.setItem(themeStorageKey, theme)
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }, [theme])

  return {
    theme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }
}
