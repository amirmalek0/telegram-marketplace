import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryGradients } from '../../features/catalog/constants'
import type { Product } from '../../features/catalog/types'
import { publicAssetURL } from '../../utils/assets'
import { formatPrice } from '../../utils/format'
import { Icon } from '../ui/Icon'

export function ProductSearch({ products }: { products: Product[] }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('fa')
  const searchResults = normalizedSearch
    ? products.filter((item) => `${item.title} ${item.description}`.toLocaleLowerCase('fa').includes(normalizedSearch)).slice(0, 8)
    : []

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSearchOpen(true)
  }

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const openProduct = (productId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(`/products/${productId}`)
  }

  return (
    <div
      className={`header-search ${searchOpen ? 'is-open' : ''}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false) }}
      onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }}
    >
      <button
        type="button"
        className="search-toggle"
        aria-label="باز کردن جست‌وجوی محصولات"
        aria-expanded={searchOpen}
        aria-controls="product-search-panel"
        onClick={() => setSearchOpen((open) => !open)}
      >
        <Icon name="search" size={20} />
      </button>
      {searchOpen && (
        <div id="product-search-panel" className="search-popover">
          <form className="search-control" onSubmit={submit} role="search">
            <Icon name="search" size={19} />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="جست‌وجوی محصولات"
              aria-label="جست‌وجوی محصولات"
            />
            {searchQuery && (
              <button type="button" className="clear-search" onClick={() => setSearchQuery('')} aria-label="پاک کردن جست‌وجو">×</button>
            )}
          </form>
          {normalizedSearch ? (
            <div className="search-results-menu">
              <div className="search-results-head">
                <strong>نتایج محصولات</strong>
                <span>{searchResults.length.toLocaleString('fa-IR')}</span>
              </div>
              {searchResults.length > 0 ? searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onPointerDown={(event) => { event.preventDefault(); openProduct(item.id) }}
                >
                  <span className={`search-result-image ${deliveryGradients[item.delivery_type]}`}>
                    {item.image_url ? <img src={publicAssetURL(item.image_url)} alt="" /> : <Icon name="box" size={20} />}
                  </span>
                  <span className="search-result-copy"><strong>{item.title}</strong><small>{formatPrice(item.price)}</small></span>
                  <Icon name="arrow" size={15} />
                </button>
              )) : (
                <div className="search-no-result"><Icon name="search" size={20} /><span>محصولی پیدا نشد.</span></div>
              )}
            </div>
          ) : (
            <div className="search-prompt"><Icon name="search" size={19} /><span>نام محصول موردنظر را وارد کنید.</span></div>
          )}
        </div>
      )}
    </div>
  )
}
