import { useId, useMemo, type ReactNode } from 'react'
import type { WidgetAppearance } from '../../features/content/widgetAppearance'
import { widgetAppearanceStyles } from '../../features/content/widgetAppearanceStyles'

export function WidgetAppearanceFrame({ appearance, children }: { appearance?: WidgetAppearance; children: ReactNode }) {
  const id = 'widget-style-' + useId().replace(/[^a-zA-Z0-9-]/g, '')
  const css = useMemo(() => appearance ? widgetAppearanceStyles(appearance, '#' + id) : '', [appearance,id])
  if (!appearance) return <>{children}</>
  return <div className={`widget-appearance-boundary ${appearance.css ? 'has-local-css' : ''}`}><style>{css}</style><div id={id} className="widget">{children}</div></div>
}
