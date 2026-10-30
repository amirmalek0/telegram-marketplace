import { lazy, Suspense, type ComponentProps } from 'react'
import { useContent } from '../../../features/content/ContentProvider'
const Dialog = lazy(() => import('./ManualCheckout').then(module => ({ default: module.ManualCheckout })))
export function ManualCheckout(props: ComponentProps<typeof Dialog>) {
  const { text } = useContent()
  return <Suspense fallback={<p role="status">{text('manual.form_loading')}</p>}><Dialog {...props} /></Suspense>
}
