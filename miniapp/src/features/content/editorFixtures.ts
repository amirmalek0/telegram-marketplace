import type { Product } from '../catalog/types'
import type { Delivery, Order, UserAccount, VipPlan, Wallet, WalletTopupPack } from '../commerce/types'
import type { Ticket, TicketCategory, TicketWithMessages } from '../tickets/types'

const now = Date.now()
const ago = (days: number) => new Date(now - days * 86_400_000).toISOString()
const future = (days: number) => new Date(now + days * 86_400_000).toISOString()

export const editorAccount: UserAccount = {
  id: 'preview-user',
  telegram_id: 123456789,
  first_name: 'کاربر',
  last_name: 'نمونه',
  username: 'preview_user',
  wallet_balance: 180,
  has_active_plan: true,
  active_plan_id: 'preview-vip-monthly',
  plan_expire_at: future(24),
}

export const editorStandardAccount: UserAccount = {
  ...editorAccount,
  wallet_balance: 35,
  has_active_plan: false,
  active_plan_id: undefined,
  plan_expire_at: undefined,
}

export const editorWallet: Wallet = {
  balance: 180,
  transactions: [
    { id: 'wallet-1', type: 'topup', amount: 250, balance_before: 0, balance_after: 250, description: 'شارژ کیف پول با تلگرام استارز', created_at: ago(3) },
    { id: 'wallet-2', type: 'purchase', amount: 70, balance_before: 250, balance_after: 180, description: 'خرید محصول از کیف پول', created_at: ago(1) },
  ],
}

export const editorVipPlans: VipPlan[] = [
  { id: 'preview-vip-monthly', title: 'VIP یک‌ماهه', stars_price: 120, duration: 30, tier: 1, status: 'active', created_at: ago(30) },
  { id: 'preview-vip-seasonal', title: 'VIP سه‌ماهه', stars_price: 290, duration: 90, tier: 2, status: 'active', created_at: ago(30) },
  { id: 'preview-vip-yearly', title: 'VIP یک‌ساله', stars_price: 890, duration: 365, tier: 3, status: 'active', created_at: ago(30) },
]

export const editorTopupPacks: WalletTopupPack[] = [25, 50, 100, 250].map((stars, index) => ({
  id: `preview-pack-${stars}`, title: index === 2 ? 'محبوب‌ترین' : `${stars} استار`, stars,
  status: 'active', sort_order: index + 1, created_at: ago(30), updated_at: ago(2),
}))

function productAt(products: Product[], index: number) {
  return products[index] || null
}

export function editorOrders(products: Product[]): Order[] {
  const first = productAt(products, 0)
  const second = productAt(products, 1) || first
  return [
    {
      id: 'preview-order-paid', product_id: first?.id || 'preview-product-1', quantity: 1,
      stars: first?.stars_price || 85, product_title: first?.title || 'محصول دیجیتال نمونه',
      delivery_status: 'delivered', delivery_item_count: 1, status: 'paid', paid_at: ago(2),
      created_at: ago(2), updated_at: ago(2),
    },
    {
      id: 'preview-order-pending', product_id: second?.id || 'preview-product-2', quantity: 1,
      stars: second?.stars_price || 140, product_title: second?.title || 'محصول ویژه فروشگاه',
      delivery_status: 'awaiting_payment', delivery_item_count: 0, status: 'pending',
      created_at: ago(0.2), updated_at: ago(0.2),
    },
    {
      id: 'preview-order-processing', product_id: first?.id || 'preview-product-1', quantity: 1,
      stars: first?.stars_price || 85, product_title: first?.title || 'محصول در حال آماده‌سازی',
      delivery_status: 'processing', delivery_item_count: 0, status: 'paid', paid_at: ago(4),
      created_at: ago(4), updated_at: ago(3),
    },
    {
      id: 'preview-order-failed', product_id: second?.id || 'preview-product-2', quantity: 1,
      stars: second?.stars_price || 140, product_title: second?.title || 'محصول با پرداخت ناموفق',
      delivery_status: 'failed', delivery_item_count: 0, status: 'failed',
      created_at: ago(5), updated_at: ago(5),
    },
    {
      id: 'preview-order-refunded', product_id: first?.id || 'preview-product-1', quantity: 1,
      stars: first?.stars_price || 85, product_title: first?.title || 'محصول بازپرداخت‌شده',
      delivery_item_count: 0, status: 'refunded', created_at: ago(8), updated_at: ago(7),
    },
    {
      id: 'preview-order-cancelled', product_id: second?.id || 'preview-product-2', quantity: 1,
      stars: second?.stars_price || 140, product_title: second?.title || 'محصول لغوشده',
      delivery_item_count: 0, status: 'cancelled', created_at: ago(10), updated_at: ago(10),
    },
  ]
}

export function editorDeliveries(products: Product[]): Delivery[] {
  const first = productAt(products, 0)
  const second = productAt(products, 1) || first
  return [
    {
      order_id: 'preview-order-paid', product_id: first?.id || 'preview-product-1',
      product_title: first?.title || 'محصول دیجیتال نمونه', status: 'delivered',
      created_at: ago(2), delivered_at: ago(2),
      items: [{ kind: 'file', label: 'فایل اصلی محصول', file_name: 'product.zip', mime_type: 'application/zip', size: 8_400_000 }],
    },
    {
      order_id: 'preview-order-processing', product_id: second?.id || 'preview-product-2',
      product_title: second?.title || 'محصول در حال آماده‌سازی', status: 'processing',
      created_at: ago(0.3), items: [],
    },
    {
      order_id: 'preview-order-failed', product_id: first?.id || 'preview-product-1',
      product_title: first?.title || 'محصول نیازمند بررسی', status: 'failed',
      error: 'آماده‌سازی محتوا ناموفق بود.', created_at: ago(4), items: [],
    },
  ]
}

export const editorTickets: Ticket[] = [
  { id: 'preview-ticket-open', user_id: 'preview-user', subject: 'راهنمای دریافت فایل خریداری‌شده', status: 'open', priority: 'medium', category: 'پشتیبانی فنی', created_at: ago(0.4), updated_at: ago(0.2), last_message_at: ago(0.2) },
  { id: 'preview-ticket-progress', user_id: 'preview-user', subject: 'بررسی وضعیت پرداخت سفارش', status: 'in_progress', priority: 'high', category: 'امور مالی', created_at: ago(3), updated_at: ago(1), last_message_at: ago(1) },
  { id: 'preview-ticket-closed', user_id: 'preview-user', subject: 'سؤال درباره اشتراک VIP', status: 'closed', priority: 'low', category: 'اشتراک VIP', created_at: ago(8), updated_at: ago(6), closed_at: ago(6), last_message_at: ago(6) },
]

export const editorTicketCategories: TicketCategory[] = [
  { id: 'preview-category-general', name: 'عمومی', created_at: ago(60) },
  { id: 'preview-category-technical', name: 'پشتیبانی فنی', created_at: ago(60) },
  { id: 'preview-category-financial', name: 'امور مالی', created_at: ago(60) },
]

export function editorTicketThread(ticketID = 'preview-ticket-open'): TicketWithMessages {
  const ticket = editorTickets.find((item) => item.id === ticketID) || editorTickets[0]
  return {
    ticket,
    messages: [
      { id: 'preview-message-1', ticket_id: ticket.id, sender_type: 'user', sender_id: 'preview-user', message: 'سلام، برای دریافت فایل محصول خریداری‌شده راهنمایی می‌خواستم.', created_at: ago(0.4) },
      { id: 'preview-message-2', ticket_id: ticket.id, sender_type: 'admin', sender_id: 'preview-admin', message: 'سلام، فایل شما در بخش دانلودها آماده است. اگر مشکلی بود همین‌جا اطلاع دهید.', created_at: ago(0.2) },
    ],
  }
}
