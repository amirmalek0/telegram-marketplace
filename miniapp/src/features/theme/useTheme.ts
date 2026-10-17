import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const themeStorageKey = 'telegram-marketplace-theme'

function readStoredTheme(): ThemeMode {
  if (new URLSearchParams(window.location.search).get('content-editor') === '1' && document.documentElement.dataset.theme) {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }
  try {
    return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('content-editor') !== '1') return
    const preview = (event: Event) => {
      const mode = (event as CustomEvent).detail
      if (mode === 'light' || mode === 'dark') setTheme(mode)
    }
    window.addEventListener('miniapp-preview-theme', preview)
    return () => window.removeEventListener('miniapp-preview-theme', preview)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim())

    try {
      if (new URLSearchParams(window.location.search).get('content-editor') !== '1') localStorage.setItem(themeStorageKey, theme)
    } catch {
      // The selected theme still applies for this session when storage is unavailable.
    }
  }, [theme])

  return {
    theme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
  }
}
