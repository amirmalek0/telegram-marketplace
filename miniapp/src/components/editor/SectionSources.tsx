import type { CatalogState } from '../../features/catalog/types'
import type { NotificationsState } from '../../features/notifications/useNotifications'
import type { UseTelegramAuthResult } from '../../hooks/useTelegramAuth'
import type { PageId, SectionSource } from '../../features/content/pageLayouts'
import type { SectionRenderer } from '../../features/content/sectionRendering'
import { ShopPage } from '../../pages/ShopPage'
import { ProfilePage } from '../../pages/ProfilePage'
import { OrdersPage } from '../../pages/OrdersPage'
import { DownloadsPage } from '../../pages/DownloadsPage'
import { TicketsPage } from '../../pages/TicketsPage'
import { NotificationsPage } from '../../pages/NotificationsPage'
import { ProductPage } from '../../pages/ProductPage'
import { CategoryPage } from '../../pages/CategoryPage'
import { TicketPage } from '../../pages/TicketPage'
import { NewTicketPage } from '../../pages/NewTicketPage'

export interface SectionEnvironment {
  catalog: CatalogState
  auth: UseTelegramAuthResult
  notifications: NotificationsState
  page: PageId
  preview: boolean
  scenario: string
}

// Each source mounts once per page, regardless of how many of its slots are used.
// Account blocks share one loader and one checkout controller; list/filter state
// stays together. Hidden sources never mount or issue their data requests.
export function SectionSources({ source, environment: env, render }: { source: SectionSource; environment: SectionEnvironment; render: SectionRenderer }) {
  const common = { preview: env.preview, scenario: env.scenario }
  const user = { initDataRaw: env.preview ? null : env.auth.initDataRaw }
  switch (source) {
    case 'catalog': return <ShopPage {...env.catalog} {...common} sectionRenderer={render} />
    case 'account': return <ProfilePage {...user} {...common} telegramUser={env.auth.user} view={env.page === 'wallet' || env.page === 'vip' ? env.page : 'profile'} sectionRenderer={render} />
    case 'orders': return <OrdersPage {...user} {...common} products={env.catalog.products} sectionRenderer={render} />
    case 'downloads': return <DownloadsPage {...user} {...common} products={env.catalog.products} sectionRenderer={render} />
    case 'tickets': return <TicketsPage {...user} {...common} ready={!env.catalog.loading} sectionRenderer={render} />
    case 'notifications': return render({ slots: { 'notifications.feed': <NotificationsPage notifications={env.notifications} {...common} /> } })
    case 'product': return <ProductPage {...env.catalog} {...user} {...common} sectionRenderer={render} />
    case 'category': return <CategoryPage {...env.catalog} {...common} sectionRenderer={render} />
    case 'ticket': return render({ slots: { 'ticket.thread': <TicketPage {...user} {...common} ready={!env.catalog.loading} /> } })
    case 'new-ticket': return render({ slots: { 'ticket.form': <NewTicketPage {...user} {...common} ready={!env.catalog.loading} /> } })
  }
}
