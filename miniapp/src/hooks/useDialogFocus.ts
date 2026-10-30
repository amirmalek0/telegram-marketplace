import { useEffect, useRef } from 'react'

export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0)
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => (focusable()[0] || ref.current)?.focus())
    const handleKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest('.content-editor-panel')) return
      if (event.key === 'Escape') close.current()
      if (event.key === 'Tab') {
        const items = focusable(), first = items[0], last = items[items.length - 1]
        if (!first) { event.preventDefault(); ref.current?.focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', handleKey); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus() }
  }, [])
  return ref
}
