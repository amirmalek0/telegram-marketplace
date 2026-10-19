import { Icon } from '../ui/Icon'
import { Fragment } from 'react'
import { defaultShopSections, type ShopSection } from '../../features/content/shopArrangement'
import type { ShopDesigns } from '../../features/content/shopDesigns'

export function StateCard({ title, body }: { title: string; body: string }) {
  return <div className="page centered-page"><section className="state-card"><h2>{title}</h2><p>{body}</p></section></div>
}

export function InlineEmpty({ text }: { text: string }) {
  return <div className="inline-empty"><Icon name="search" size={22} /><span>{text}</span></div>
}

export function ShopSkeleton({ sections = defaultShopSections, designs }: { sections?: ShopSection[]; designs?: ShopDesigns }) {
  return (
    <div className="page skeleton-page" data-category-design={designs?.categories} data-product-design={designs?.products}>
      {sections.map(section => <Fragment key={section}>
        <div className="skeleton title-skeleton" />
        {section === 'categories' ? <div className="category-grid-skeleton">
          {[1, 2, 3].map(item => <div key={item} className="skeleton category-skeleton" />)}
        </div> : <div className="product-design-skeletons"><div className="skeleton product-skeleton" /><div className="skeleton product-skeleton" /></div>}
      </Fragment>)}
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
