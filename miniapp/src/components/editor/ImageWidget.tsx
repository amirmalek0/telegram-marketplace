import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../../features/content/ContentProvider'
import type { PageSection } from '../../features/content/pageLayouts'
import { imageWidgetStyles } from '../../features/content/imageWidgetStyles'
import '../../styles/text-widget.css'

export function ImageWidget({ item, selectionId }: { item: PageSection; selectionId?: string }) {
  const { editorMode } = useContent()
  const [root, setRoot] = useState<ShadowRoot | null>(null)
  const [loaded, setLoaded] = useState<string>()
  const [failed, setFailed] = useState<string>()
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (node) setRoot(node.shadowRoot ?? node.attachShadow({ mode: 'open' }))
  }, [])
  const widget = item.image
  if (!widget || (!widget.src && !editorMode)) return null
  const loading = !!widget.src && loaded !== widget.src && failed !== widget.src
  return <div className={`text-widget-boundary image-widget-boundary ${editorMode ? 'is-editable' : ''}`} data-custom-widget={selectionId ?? item.id}
    tabIndex={editorMode ? 0 : undefined} role={editorMode ? 'button' : undefined} aria-label={editorMode ? 'ویرایش ویجت تصویر' : undefined}>
    <div ref={attach} />
    {root && createPortal(<><style>{imageWidgetStyles(widget, item.design)}</style><div className="alignment"><figure className={`widget ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
      {!widget.src ? <div className="placeholder">برای بارگذاری تصویر، این ویجت را انتخاب کنید</div> : failed === widget.src ? <div className="placeholder">{widget.alt || 'تصویر در دسترس نیست'}</div> : <div className="image-area">
        <img key={widget.src} src={widget.src} alt={widget.alt} loading="lazy" decoding="async" onLoad={() => setLoaded(widget.src)} onError={() => setFailed(widget.src)} />
        {loading && <span className="skeleton" aria-hidden="true" />}
      </div>}
    </figure></div></>, root)}
  </div>
}
