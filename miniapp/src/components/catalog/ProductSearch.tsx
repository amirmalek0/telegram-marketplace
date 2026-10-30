import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Product } from '../../features/catalog/types'
import { normalizeProductSearch, searchProducts } from '../../features/catalog/search'
import { Icon } from '../ui/Icon'
import type { NavigationIcon } from '../../features/content/navigationSettings'
import { useContent } from '../../features/content/ContentProvider'
import { SearchResults } from './SearchResults'
import '../../styles/search-widget.css'

export function ProductSearch({ products, widget = false, design = 'rounded', loading = false, error = false, icon = 'search', caption = false }: { products: Product[]; widget?: boolean; design?: string; loading?: boolean; error?: boolean; icon?: NavigationIcon; caption?: boolean }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { editorMode, text } = useContent()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const normalized = normalizeProductSearch(searchQuery)
  const results = searchProducts(products, searchQuery)
  const submit = (event: FormEvent) => { event.preventDefault(); setSearchOpen(true) }
  const close = () => { setSearchOpen(false); if (!widget) searchRef.current?.querySelector<HTMLButtonElement>('.search-toggle')?.focus() }
  useEffect(() => { if (searchOpen && !widget) inputRef.current?.focus() }, [searchOpen, widget])
  useEffect(() => { setSearchOpen(false); setSearchQuery('') }, [location.pathname])
  useEffect(() => {
    if (!searchOpen) return
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element) || searchRef.current?.contains(target)) return
      if (editorMode && target.closest('.content-editor-backdrop')) return
      setSearchOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [editorMode, searchOpen])
  const field = <form className="search-control" onSubmit={submit} role="search">
    <Icon name={icon} size={19} />
    <input ref={inputRef} value={searchQuery} type="search" autoComplete="off" aria-controls={searchOpen ? panelId : undefined} aria-expanded={searchOpen}
      onFocus={() => { if (widget) setSearchOpen(true) }} onChange={event => { setSearchQuery(event.target.value); setSearchOpen(true) }} placeholder={text('search.placeholder')} aria-label={text('search.placeholder')} />
    {searchQuery && <button type="button" className="clear-search" onClick={() => { setSearchQuery(''); inputRef.current?.focus() }} aria-label={text('search.clear')}>×</button>}
  </form>
  return <div ref={searchRef} className={`${widget ? 'search-widget' : 'header-search'} ${searchOpen ? 'is-open' : ''}`} data-search-design={widget ? design : undefined}
    onBlur={event => {
      const next = event.relatedTarget
      if (!next || event.currentTarget.contains(next)) return
      if (editorMode && next instanceof Element && next.closest('.content-editor-backdrop')) return
      setSearchOpen(false)
    }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
    {widget ? field : <button type="button" className="search-toggle" aria-label={text('search.open')} aria-expanded={searchOpen} aria-controls={panelId} onClick={() => setSearchOpen(open => !open)}><Icon name={icon} size={20} />{caption && <span className="header-action-caption">{text('header.search_caption')}</span>}</button>}
    {searchOpen && <div id={panelId} className="search-popover">
      {!widget && field}
      <SearchResults query={normalized} results={results} loading={loading} error={error} onOpen={id => { setSearchOpen(false); setSearchQuery(''); navigate(`/products/${id}`) }} />
    </div>}
  </div>
}
