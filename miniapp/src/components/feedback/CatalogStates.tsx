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
      <div className="category-grid-skeleton">
        {[1, 2, 3].map((item) => <div key={item} className="skeleton category-skeleton" />)}
      </div>
      <div className="skeleton title-skeleton" />
      <div className="skeleton product-skeleton" />
      <div className="skeleton product-skeleton" />
    </div>
  )
}

export function ProductSkeleton() {
  return <div className="page product-detail" aria-busy="true">
    <div className="skeleton product-overview-skeleton" />
    <div className="skeleton product-checkout-skeleton" />
    <div className="skeleton product-description-skeleton" />
  </div>
}
