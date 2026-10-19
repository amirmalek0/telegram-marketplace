import { Fragment, type ReactNode } from 'react'
import { useContent } from '../../features/content/ContentProvider'
import { sectionDefinition, sectionLibrary, type PageSection, type SectionSource } from '../../features/content/pageLayouts'
import type { SectionBundle } from '../../features/content/sectionRendering'
import { SectionSources, type SectionEnvironment } from './SectionSources'
import '../../styles/page-composer.css'

const sourceOrder = [...new Set(sectionLibrary.map(section => section.source))]

function SectionFrame({ item, children }: { item: PageSection; children: ReactNode }) {
  const definition = sectionDefinition(item.type)!
  return <div className={`composed-section ${definition.className} section-design-${item.design}`}
    data-section-type={item.type} data-section-design={item.design}
    data-category-design={item.type === 'catalog.categories' ? item.design : undefined}
    data-product-design={item.type === 'catalog.products' ? item.design : undefined}>
    {children}
  </div>
}

function SourceTree({ sources, index = 0, environment, sections, bundles = {} }: {
  sources: SectionSource[]; index?: number; environment: SectionEnvironment; sections: PageSection[]; bundles?: Partial<Record<SectionSource, SectionBundle>>
}) {
  const source = sources[index]
  if (source) return <SectionSources source={source} environment={environment} render={bundle =>
    <SourceTree sources={sources} index={index + 1} environment={environment} sections={sections} bundles={{ ...bundles, [source]: bundle }} />
  } />
  const shownStatuses = new Set<SectionSource>()
  return <>
    {sections.map(item => {
      const source = sectionDefinition(item.type)!.source
      const bundle = bundles[source]
      if (!bundle) return null
      let node = bundle.slots[item.type]
      if (bundle.status) {
        if (shownStatuses.has(source)) return null
        shownStatuses.add(source)
        node = bundle.status
      }
      return node == null ? null : <SectionFrame key={item.type} item={item}>{node}</SectionFrame>
    })}
    {sources.map(source => <Fragment key={source}>{bundles[source]?.chrome}</Fragment>)}
  </>
}

export function PageComposer({ environment }: { environment: SectionEnvironment }) {
  const { layoutForPage } = useContent()
  const sections = layoutForPage(environment.page).sections.filter(item => item.visible)
  const sources = sourceOrder.filter(source => sections.some(item => sectionDefinition(item.type)?.source === source))
  return <div className={`page composed-page composed-page-${environment.page}`} data-layout-page={environment.page}>
    <SourceTree sources={sources} environment={environment} sections={sections} />
  </div>
}
