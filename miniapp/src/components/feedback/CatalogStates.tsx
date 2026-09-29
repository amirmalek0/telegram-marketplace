import { Icon } from '../ui/Icon'

export function StateCard({ title, body }: { title: string; body: string }) {
  return <div className="page centered-page"><section className="state-card"><h2>{title}</h2><p>{body}</p></section></div>
}

export function InlineEmpty({ text }: { text: string }) {
  return <div className="inline-empty"><Icon name="search" size={22} /><span>{text}</span></div>
}

export function ShopSkeleton() {
  return (
    <div className="page skeleton-page">
      <div className="skeleton title-skeleton" />
      <div className="skeleton category-grid-skeleton">
        {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton category-skeleton" />)}
      </div>
      <div className="skeleton title-skeleton" />
      <div className="skeleton product-skeleton" />
    </div>
  )
}
