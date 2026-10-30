import type { Product } from './types'

export const normalizeProductSearch = (value: string) => value.toLocaleLowerCase('fa').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064b-\u065f\u0670]/g, '').replace(/[\u200c\s]+/g, ' ').trim()
export function searchProducts(products: Product[], query: string): Product[] {
  const terms = normalizeProductSearch(query).split(' ').filter(Boolean)
  if (!terms.length) return []
  return products.filter(item => {
    const haystack = normalizeProductSearch(item.title + ' ' + item.description)
    return terms.every(term => haystack.includes(term))
  }).slice(0, 8)
}
