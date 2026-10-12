import { PaginatedResponse } from './common';

export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  telegram_id: number;
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
}
export type UpdateCouponRequest = Partial<CreateCouponRequest> & { is_active?: boolean };
export type CouponsPaginatedResponse = PaginatedResponse<CouponResponse>;

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
export interface OrderResponse {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  stars: number;
  status: OrderStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}
export type OrdersPaginatedResponse = PaginatedResponse<OrderResponse>;

export interface TelegramStarsPaymentResponse {
  id: string;
  order_id: string;
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
}
export type TelegramStarsPaymentsPaginatedResponse = PaginatedResponse<TelegramStarsPaymentResponse>;

export interface PaymentConfigResponse {
  test_mode: boolean;
  updated_at: string;
}

export interface VipPlanResponse {
  id: string;
  title: string;
  stars_price: number;
  duration: number;
  status: 'active' | 'inactive';
  created_at: string;
}
export interface CreateVipPlanRequest {
  title: string;
  stars_price: number;
  duration: number;
  status: 'active' | 'inactive';
}
export type UpdateVipPlanRequest = Partial<CreateVipPlanRequest>;
export type VipPlansPaginatedResponse = PaginatedResponse<VipPlanResponse>;

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
