import apiClient from './client';
import {
  AdjustWalletRequest,
  CouponsPaginatedResponse,
  CreateCouponRequest,
  CreateVipPlanRequest,
  OrderStatus,
  OrdersPaginatedResponse,
  PaymentsPaginatedResponse,
  PaymentConfigResponse,
  TicketCategoriesPaginatedResponse,
  TicketMessageResponse,
  TicketPriority,
  TicketResponse,
  TicketStatus,
  TicketWithMessagesResponse,
  TicketsPaginatedResponse,
  UpdateCouponRequest,
  UpdateUserRequest,
  UpdateVipPlanRequest,
  UserResponse,
  UsersPaginatedResponse,
  VipPlansPaginatedResponse,
  WalletBalanceResponse,
  WalletTransactionResponse,
  WalletTransactionsPaginatedResponse,
} from '@/types';

type PageParams = { page?: number; per_page?: number };

export const usersApi = {
  list: (params?: PageParams, signal?: AbortSignal) =>
    apiClient.get<UsersPaginatedResponse>('/user', { params, signal }).then(r => r.data),
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<UserResponse>(`/user/${id}`, { signal }).then(r => r.data),
  update: (id: string, data: UpdateUserRequest) =>
    apiClient.patch<UserResponse>(`/user/${id}`, data).then(r => r.data),
  setBanned: (id: string, is_banned: boolean) =>
    apiClient.patch<{ is_banned: boolean }>(`/user/${id}/ban`, { is_banned }).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/user/${id}`),
};

export const walletsApi = {
  balance: (userId: string) => apiClient.get<WalletBalanceResponse>(`/wallet/users/${userId}/balance`).then(r => r.data),
  transactions: (userId: string, params?: PageParams) =>
    apiClient.get<WalletTransactionsPaginatedResponse>(`/wallet/users/${userId}/transactions`, { params }).then(r => r.data),
  adjust: (data: AdjustWalletRequest) => apiClient.post<WalletTransactionResponse>('/wallet/adjust', data).then(r => r.data),
};

export const couponsApi = {
  list: (params?: PageParams, signal?: AbortSignal) => apiClient.get<CouponsPaginatedResponse>('/coupon', { params, signal }).then(r => r.data),
  create: (data: CreateCouponRequest) => apiClient.post('/coupon', data).then(r => r.data),
  update: (id: string, data: UpdateCouponRequest) => apiClient.patch(`/coupon/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/coupon/${id}`),
};

export const ordersApi = {
  list: (params?: PageParams, signal?: AbortSignal) => apiClient.get<OrdersPaginatedResponse>('/order/all', { params, signal }).then(r => r.data),
  updateStatus: (id: string, status: OrderStatus) => apiClient.patch(`/order/${id}/status`, { status }),
};

export const paymentsApi = {
  list: (params?: PageParams, signal?: AbortSignal) => apiClient.get<PaymentsPaginatedResponse>('/payment/all', { params, signal }).then(r => r.data),
  getConfig: (signal?: AbortSignal) => apiClient.get<PaymentConfigResponse>('/payment/config', { signal }).then(r => r.data),
  updateConfig: (testMode: boolean) => apiClient.patch<PaymentConfigResponse>('/payment/config', { test_mode: testMode }).then(r => r.data),
};

export const vipApi = {
  list: (params?: PageParams, signal?: AbortSignal) => apiClient.get<VipPlansPaginatedResponse>('/vip/plan', { params, signal }).then(r => r.data),
  create: (data: CreateVipPlanRequest) => apiClient.post('/vip/plan', data).then(r => r.data),
  update: (id: string, data: UpdateVipPlanRequest) => apiClient.patch(`/vip/plan/${id}`, data).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/vip/plan/${id}`),
};

export const ticketsApi = {
  list: (params?: PageParams & { status?: TicketStatus | ''; priority?: TicketPriority | ''; category?: string; user_id?: string }, signal?: AbortSignal) =>
    apiClient.get<TicketsPaginatedResponse>('/ticket', { params, signal }).then(r => r.data),
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<TicketWithMessagesResponse>(`/ticket/${id}`, { signal }).then(r => r.data),
  update: (id: string, data: Partial<Pick<TicketResponse, 'status' | 'priority' | 'category' | 'subject'>>) =>
    apiClient.patch<TicketResponse>(`/ticket/${id}`, data).then(r => r.data),
  addMessage: (id: string, message: string) => apiClient.post<TicketMessageResponse>(`/ticket/${id}/messages`, { message }).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/ticket/${id}`),
};

export const ticketCategoriesApi = {
  list: (params?: PageParams) => apiClient.get<TicketCategoriesPaginatedResponse>('/ticket/category', { params }).then(r => r.data),
  create: (name: string) => apiClient.post('/ticket/category', { name }).then(r => r.data),
  update: (id: string, name: string) => apiClient.patch(`/ticket/category/${id}`, { name }).then(r => r.data),
  delete: (id: string) => apiClient.delete(`/ticket/category/${id}`),
};
