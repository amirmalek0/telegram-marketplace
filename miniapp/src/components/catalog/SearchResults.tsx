import type { Product } from '../../features/catalog/types'
import { deliveryGradients } from '../../features/catalog/constants'
import { useContent } from '../../features/content/ContentProvider'
import { publicAssetURL } from '../../utils/assets'
import { Icon } from '../ui/Icon'

export function SearchResults({ query, results, loading, error, onOpen }: { query: string; results: Product[]; loading: boolean; error: boolean; onOpen: (id: string) => void }) {
  const { text } = useContent()
  if (loading || error || !query) return <div className="search-prompt" role="status"><Icon name="search" size={19} /><span>{text(loading ? 'search.loading' : error ? 'search.error' : 'search.prompt')}</span></div>
  return <div className="search-results-menu">
    <div className="search-results-head" role="status"><strong>{text('search.results')}</strong><span>{results.length.toLocaleString('fa-IR')}</span></div>
    {results.length ? results.map(item => <button key={item.id} type="button" className="search-result-item" onClick={() => onOpen(item.id)}>
      <span className={`search-result-image ${deliveryGradients[item.delivery_type]}`}>{item.image_url ? <img src={publicAssetURL(item.image_url)} alt="" /> : <Icon name="box" size={20} />}</span>
      <span className="search-result-copy"><strong>{item.title}</strong><small>{item.stars_price.toLocaleString('fa-IR')} ⭐</small></span><Icon name="arrow" size={15} />
    </button>) : <div className="search-no-result" role="status"><Icon name="search" size={20} /><span>{text('search.empty')}</span></div>}
  </div>
}
