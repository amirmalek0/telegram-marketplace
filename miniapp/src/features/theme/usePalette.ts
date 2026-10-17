import { useCallback, useEffect, useState } from 'react'
import { paletteCSS, parsePalette, type Palette } from './palette'

export function usePalette(published: string | undefined, editorMode: boolean) {
  // undefined means use published settings; null explicitly previews defaults.
  const [preview, setPreview] = useState<Palette | null | undefined>()
  const active = editorMode && preview !== undefined ? preview : parsePalette(published)
  const css = active ? paletteCSS(active) : ''

  useEffect(() => {
    const root = document.documentElement
    const style = document.createElement('style')
    style.dataset.miniappPalette = 'true'
    style.textContent = css
    document.head.appendChild(style)
    if (css) root.dataset.customPalette = 'true'
    else delete root.dataset.customPalette
    const updateBrowserColor = () => document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim())
    updateBrowserColor()
    const observer = new MutationObserver(updateBrowserColor)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => { observer.disconnect(); style.remove(); delete root.dataset.customPalette }
  }, [css])

  return useCallback((value: unknown, mode: unknown) => {
    if (!editorMode || (mode !== 'light' && mode !== 'dark')) return
    const palette = parsePalette(value)
    if (value !== null && !palette) return
    setPreview(palette)
    document.documentElement.dataset.theme = mode
    window.dispatchEvent(new CustomEvent('miniapp-preview-theme', { detail: mode }))
  }, [editorMode])
}
