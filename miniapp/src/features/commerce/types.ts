export interface StarsInvoice {
  order_id: string
  payment_id: string
  invoice_url: string
  stars: number
  simulation_enabled: boolean
}

export interface SimulatedPayment {
  order_id: string
  status: 'succeeded' | 'failed' | 'cancelled'
  delivery_status?: 'processing' | 'delivered' | 'failed'
  delivery_error?: string
}

export interface Order {
  id: string
  product_id: string
  quantity: number
  stars: number
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
