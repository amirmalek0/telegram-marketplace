export type DeliveryType = 'file' | 'message' | 'inventory' | 'bundle' | 'api'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next_page: boolean
  has_prev_page: boolean
}

export interface Category {
  id: string
  title: string
  icon_url: string
  active: boolean
  sort_order: number
  created_at: string
}

export interface Product {
  id: string
  title: string
  description: string
  stars_price: number
  category_id: string
  image_url: string
  delivery_type: DeliveryType
  demo_url?: string
  vip_only: boolean
  repurchasable: boolean
  views_count: number
  status: string
  created_at: string
}

export interface CatalogState {
  categories: Category[]
  products: Product[]
  categoryById: Map<string, Category>
  loading: boolean
  error: string | null
}

export interface UserResponse {
  id: string
  first_name: string
  last_name: string
  username: string
  telegram_id: number
}
