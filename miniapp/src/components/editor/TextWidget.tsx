import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../../features/content/ContentProvider'
import type { PageSection } from '../../features/content/pageLayouts'
import { textWidgetStyles } from '../../features/content/textWidgetStyles'
import '../../styles/text-widget.css'

// Each instance owns a shadow root: even selectors such as body, *, or :host
// cannot style another widget. The outer paint/layout boundary also confines
// positioned descendants without constraining the normal document height.
export function TextWidget({ item, selectionId }: { item: PageSection; selectionId?: string }) {
  const { editorMode } = useContent()
  const [root, setRoot] = useState<ShadowRoot | null>(null)
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (node) setRoot(node.shadowRoot ?? node.attachShadow({ mode: 'open' }))
  }, [])
  if (!item.text) return null
  const Tag = item.text.tag
  return <div className={`text-widget-boundary ${editorMode ? 'is-editable' : ''}`} data-custom-widget={selectionId ?? item.id}
    tabIndex={editorMode ? 0 : undefined} role={editorMode ? 'button' : undefined}
    aria-label={editorMode ? 'ویرایش ویجت: ' + item.text.content.slice(0, 80) : undefined}>
    <div ref={attach} />
    {root && createPortal(<><style>{textWidgetStyles(item.text, item.design)}</style><Tag className="widget">{item.text.content}</Tag></>, root)}
  </div>
}
