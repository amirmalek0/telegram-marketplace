export interface StarsInvoice {
  order_id?: string
  payment_id: string
  invoice_url?: string
  stars: number
  simulation_enabled: boolean
  completed: boolean
  purpose: 'product' | 'vip_plan' | 'wallet_topup'
  wallet_balance?: number
}

export interface SimulatedPayment {
  order_id?: string
  reference_id?: string
  purpose: 'product' | 'vip_plan' | 'wallet_topup'
  status: 'succeeded' | 'failed' | 'cancelled'
  delivery_status?: 'processing' | 'delivered' | 'failed'
  delivery_error?: string
  wallet_balance?: number
}

export interface WalletTransaction {
  id: string
  type: 'purchase' | 'reward' | 'topup' | 'refund' | 'admin_adjust'
  amount: number
  balance_before: number
  balance_after: number
  description: string
  created_at: string
}

export interface Wallet {
  balance: number
  transactions: WalletTransaction[]
}

export interface VipPlan {
  id: string
  title: string
  stars_price: number
  duration: number
  tier: number
  status: 'active' | 'inactive'
  created_at: string
}

export interface WalletTopupPack {
  id: string
  title: string
  stars: number
  status: 'active' | 'inactive'
  sort_order: number
  created_at: string
  updated_at: string
}

export interface VipQuote {
  plan_id: string
  plan_title: string
  original_stars: number
  credit_stars: number
  payable_stars: number
  remaining_days: number
  is_upgrade: boolean
  current_plan_id?: string
  current_plan_title?: string
  current_tier: number
  target_tier: number
  current_expire_at?: string
}

export interface UserAccount {
  photo_url?: string
  id: string
  telegram_id: number
  first_name: string
  last_name: string
  username: string
  wallet_balance: number
  has_active_plan: boolean
  active_plan_id?: string
  plan_expire_at?: string
}

export interface Order {
  currency?: string
  amount_minor?: number
  toman?: number
  id: string
  product_id: string
  quantity: number
  stars: number
  product_title: string
  delivery_status?: 'awaiting_payment' | 'processing' | 'delivered' | 'failed'
  delivery_item_count: number
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  paid_at?: string
  created_at: string
  updated_at: string
}

export interface DeliveryItem {
  kind: 'file' | 'message' | 'inventory' | 'api'
  label: string
  content?: string
  download_url?: string
  file_name?: string
  mime_type?: string
  size?: number
}

export interface Delivery {
  order_id: string
  product_id: string
  product_title: string
  status: 'processing' | 'delivered' | 'failed'
  error?: string
  created_at: string
  delivered_at?: string
  items: DeliveryItem[]
}
