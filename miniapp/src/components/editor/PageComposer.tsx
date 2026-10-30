import { Fragment, type ReactNode } from 'react'
import { useContent } from '../../features/content/ContentProvider'
import { sectionDefinition, sectionLibrary, type PageSection, type SectionSource } from '../../features/content/pageLayouts'
import { resolveGlobalWidgets, type GlobalWidgets } from '../../features/content/globalWidgets'
import { WidgetAppearanceFrame } from './WidgetAppearanceFrame'
import { isTextWidgetType } from '../../features/content/textWidgets'
import { TextWidget } from './TextWidget'
import { ImageWidget } from './ImageWidget'
import { ProductSearch } from '../catalog/ProductSearch'
import type { SectionBundle } from '../../features/content/sectionRendering'
import { SectionSources, type SectionEnvironment } from './SectionSources'
import '../../styles/page-composer.css'

const sourceOrder = [...new Set(sectionLibrary.map(section => section.source))].filter(source => source !== 'custom')

function SectionFrame({ item, children }: { item: PageSection; children: ReactNode }) {
  const definition = sectionDefinition(item.type)!
  return <div className={`composed-section ${definition.className} section-design-${item.design}`}
    data-section-type={item.type} data-section-design={item.design}
    data-category-design={item.type === 'catalog.categories' ? item.design : undefined}
    data-product-design={item.type === 'catalog.products' ? item.design : undefined}>
    {children}
  </div>
}

function SourceTree({ sources, index = 0, environment, sections, globals, bundles = {} }: {
  sources: SectionSource[]; index?: number; environment: SectionEnvironment; sections: PageSection[]; globals: GlobalWidgets; bundles?: Partial<Record<SectionSource, SectionBundle>>
}) {
  const source = sources[index]
  if (source) return <SectionSources source={source} environment={environment} render={bundle =>
    <SourceTree sources={sources} index={index + 1} environment={environment} sections={sections} globals={globals} bundles={{ ...bundles, [source]: bundle }} />
  } />
  const shownStatuses = new Set<SectionSource>()
  const render = (item: PageSection, key: string, ownerId?: string): ReactNode => {
    if (!item.visible) return null
    let node: ReactNode
    if (item.type === 'global.widget') {
      const group = globals[item.widgetId!]
      if (!group) return null
      node = <div className="global-widget-group">{group.sections.map(child => render(child, key + '/' + (child.id ?? child.type), item.id))}</div>
    } else if (item.type === 'catalog.search') node = <ProductSearch widget design={item.design} products={environment.catalog.products} loading={environment.catalog.loading} error={!!environment.catalog.error} />
    else if (isTextWidgetType(item.type)) node = <TextWidget item={item} selectionId={ownerId} />
    else if (item.type === 'media.image') node = <ImageWidget item={item} selectionId={ownerId} />
    else {
      const source = sectionDefinition(item.type)!.source
      const bundle = bundles[source]
      if (!bundle) return null
      node = bundle.slots[item.type]
      if (bundle.status) {
        if (shownStatuses.has(source)) return null
        shownStatuses.add(source)
        node = bundle.status
      }
      if (node == null) return null
      node = <SectionFrame item={item}>{node}</SectionFrame>
    }
    return <WidgetAppearanceFrame key={key} appearance={item.appearance}>{node}</WidgetAppearanceFrame>
  }
  return <>
    {sections.map(item => render(item, item.id ?? item.type))}
    {sources.map(source => <Fragment key={source}>{bundles[source]?.chrome}</Fragment>)}
  </>
}

export function PageComposer({ environment }: { environment: SectionEnvironment }) {
  const { layoutForPage, globalWidgets } = useContent()
  const layout = layoutForPage(environment.page)
  const resolved = resolveGlobalWidgets(layout, globalWidgets).filter(entry => entry.item.visible)
  const sources = sourceOrder.filter(source => resolved.some(({ item }) => sectionDefinition(item.type)?.source === source))
  return <div className={`page composed-page composed-page-${environment.page}`} data-layout-page={environment.page}>
    <SourceTree sources={sources} environment={environment} sections={layout.sections} globals={globalWidgets} />
  </div>
}
