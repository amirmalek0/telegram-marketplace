import { FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryGradients } from '../../features/catalog/constants'
import type { Product } from '../../features/catalog/types'
import { publicAssetURL } from '../../utils/assets'
import { Icon } from '../ui/Icon'
import { useContent } from '../../features/content/ContentProvider'

export function ProductSearch({ products }: { products: Product[] }) {
  const navigate = useNavigate()
  const { editorMode, text } = useContent()
  const searchRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!searchOpen) return
    const closeOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || searchRef.current?.contains(target)) return
      if (editorMode && target.closest('.content-editor-backdrop')) return
      setSearchOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [editorMode, searchOpen])

  const openProduct = (productId: string) => {
    setSearchOpen(false)
    setSearchQuery('')
    navigate(`/products/${productId}`)
  }

  return (
    <div
      ref={searchRef}
      className={`header-search ${searchOpen ? 'is-open' : ''}`}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (!next || event.currentTarget.contains(next)) return
        if (editorMode && next instanceof Element && next.closest('.content-editor-backdrop')) return
        setSearchOpen(false)
      }}
      onKeyDown={(event) => { if (event.key === 'Escape') setSearchOpen(false) }}
    >
      <button
        type="button"
        className="search-toggle"
        aria-label={text('search.open')}
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
              placeholder={text('search.placeholder')}
              aria-label={text('search.placeholder')}
            />
            {searchQuery && (
              <button type="button" className="clear-search" onClick={() => setSearchQuery('')} aria-label={text('search.clear')}>×</button>
            )}
          </form>
          {normalizedSearch ? (
            <div className="search-results-menu">
              <div className="search-results-head">
                <strong>{text('search.results')}</strong>
                <span>{searchResults.length.toLocaleString('fa-IR')}</span>
              </div>
              {searchResults.length > 0 ? searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="search-result-item"
                  onClick={() => openProduct(item.id)}
                >
                  <span className={`search-result-image ${deliveryGradients[item.delivery_type]}`}>
                    {item.image_url ? <img src={publicAssetURL(item.image_url)} alt="" /> : <Icon name="box" size={20} />}
                  </span>
                  <span className="search-result-copy"><strong>{item.title}</strong><small>{item.stars_price.toLocaleString('fa-IR')} ⭐</small></span>
                  <Icon name="arrow" size={15} />
                </button>
              )) : (
                <div className="search-no-result"><Icon name="search" size={20} /><span>{text('search.empty')}</span></div>
              )}
            </div>
          ) : (
            <div className="search-prompt"><Icon name="search" size={19} /><span>{text('search.prompt')}</span></div>
          )}
        </div>
      )}
    </div>
  )
}
