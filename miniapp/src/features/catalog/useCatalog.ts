import { useEffect, useMemo, useState } from 'react'
import { ApiClient } from '../../api/client'
import type { TelegramUser } from '../../hooks/useTelegramAuth'
import type { Category, PaginatedResponse, Product, UserResponse } from './types'

export function useCatalog(user: TelegramUser | null, initDataRaw: string | null, adminToken?: string | null) {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if ((!user || !initDataRaw) && !adminToken) {
      setLoading(false)
      return
    }

    let active = true
    const client = new ApiClient(adminToken ? { bearerToken: adminToken } : { initDataRaw: initDataRaw || undefined })

    async function loadCatalog() {
      setLoading(true)
      setError(null)

      try {
        if (user && initDataRaw) {
          await client.post<UserResponse>('/user', {
            first_name: user.firstName,
            last_name: user.lastName || '',
            username: user.username || '',
            telegram_id: user.id,
          })
        }

        const [categoryResponse, productResponse] = await Promise.all([
          client.get<PaginatedResponse<Category>>('/category?per_page=100'),
          client.get<PaginatedResponse<Product>>('/product?per_page=100'),
        ])

        if (!active) return

        // Filtering preserves the sort_order ordering returned by the API.
        setCategories(categoryResponse.data.filter((category) => category.active))
        setProducts(productResponse.data.filter((product) => product.status === 'active'))
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'دریافت اطلاعات فروشگاه ناموفق بود')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadCatalog()
    return () => { active = false }
  }, [adminToken, initDataRaw, user])

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  return { categories, products, categoryById, loading, error }
}
