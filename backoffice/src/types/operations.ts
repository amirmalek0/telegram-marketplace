import { PaginatedResponse } from './common';

export interface UserResponse {
	photo_url?: string;
	phone_verified_at?: string;
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  telegram_id: number;
  wallet_balance: number;
  phone_number: string;
  has_active_plan: boolean;
  active_plan_id?: string;
  plan_expire_at?: string;
  referred_by?: number;
  is_banned: boolean;
  created_at: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
}

export type UsersPaginatedResponse = PaginatedResponse<UserResponse>;

export type DiscountType = 'static' | 'percentage';
export interface CouponResponse {
  id: string;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  usage_limit: number;
  usage_count: number;
  expires_at?: string;
  is_active: boolean;
  product_ids: string[];
  user_ids: string[];
  created_at: string;
  updated_at: string;
}
export interface CreateCouponRequest {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  usage_limit: number;
  expires_at?: string;
  product_ids: string[];
  user_ids: string[];
}
export type UpdateCouponRequest = Partial<CreateCouponRequest> & { is_active?: boolean };
export interface CouponSummary {
  active: number;
  expired: number;
  total: number;
}
export type CouponsPaginatedResponse = PaginatedResponse<CouponResponse> & { summary: CouponSummary };

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export interface OrderResponse {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  stars: number;
  original_stars: number;
  discount_stars: number;
  coupon_code?: string;
  user?: Pick<UserResponse, 'id' | 'first_name' | 'last_name' | 'username' | 'telegram_id'> | null;
  product_title: string;
  delivery_status?: 'awaiting_payment' | 'processing' | 'delivered' | 'failed';
  delivery_item_count: number;
  status: OrderStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
export interface OrdersSummary { total: number; pending: number; paid: number; paid_stars: number; }
export type OrdersPaginatedResponse = PaginatedResponse<OrderResponse> & { summary: OrdersSummary };

export interface TelegramStarsPaymentResponse {
  id: string;
  order_id?: string;
  user_id: string;
  purpose: 'product' | 'vip_plan' | 'wallet_topup';
  target_id?: string;
  stars: number;
  checkout_reference: string;
  external_transaction_id?: string;
  provider_transaction_id?: string;
  is_test: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
  refunded_at?: string;
  user?: OrderResponse['user'];
  target_title: string;
  product_id?: string;
  quantity: number;
  coupon_code?: string;
  discount_stars: number;
}
export interface PaymentsSummary { total: number; succeeded: number; pending: number; failed: number; refunded: number; test_total: number; paid_stars: number; }
export type TelegramStarsPaymentsPaginatedResponse = PaginatedResponse<TelegramStarsPaymentResponse> & { summary: PaymentsSummary };

export interface PaymentConfigResponse {
  test_mode: boolean;
  updated_at: string;
}

export interface VipPlanResponse {
  id: string;
  title: string;
  stars_price: number;
  duration: number;
  tier: number;
  status: 'active' | 'inactive';
  created_at: string;
}
export interface CreateVipPlanRequest {
  title: string;
  stars_price: number;
  duration: number;
  tier: number;
  status: 'active' | 'inactive';
}
export type UpdateVipPlanRequest = Partial<CreateVipPlanRequest>;
export type VipPlansPaginatedResponse = PaginatedResponse<VipPlanResponse>;

export interface WalletTopupPackResponse {
  id: string;
  title: string;
  stars: number;
  status: 'active' | 'inactive';
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export type CreateWalletTopupPackRequest = Omit<WalletTopupPackResponse, 'id' | 'created_at' | 'updated_at'>;
export interface WalletTransactionResponse {
  id: string;
  type: 'purchase' | 'reward' | 'topup' | 'refund' | 'admin_adjust';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
}
export interface AdminWalletResponse {
	photo_url?: string;
	phone_number?: string;
  user_id: string;
  first_name: string;
  last_name: string;
  username: string;
  telegram_id: number;
  balance: number;
  has_active_plan: boolean;
  plan_expire_at?: string;
  transaction_count: number;
}
export interface AdminWalletDetailResponse {
  wallet: AdminWalletResponse;
  transactions: WalletTransactionResponse[];
}
export type AdminWalletsPaginatedResponse = PaginatedResponse<AdminWalletResponse>;

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export interface TicketResponse {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  last_message_at: string;
  user?: UserResponse;
}
export type TicketsPaginatedResponse = PaginatedResponse<TicketResponse>;
export interface TicketMessageResponse {
  id: string;
  ticket_id: string;
  sender_type: string;
  sender_id: string;
  message: string;
  created_at: string;
}
export interface TicketWithMessagesResponse {
  ticket: TicketResponse;
  messages: TicketMessageResponse[];
}
export interface TicketCategoryResponse { id: string; name: string; created_at: string }
export type TicketCategoriesPaginatedResponse = PaginatedResponse<TicketCategoryResponse>;
