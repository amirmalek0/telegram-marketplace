import apiClient from './client';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductsPaginatedResponse,
} from '@/types';

export const productsApi = {
  list: (params?: { page?: number; per_page?: number; category_id?: string }, signal?: AbortSignal) =>
    apiClient.get<ProductsPaginatedResponse>('/products', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<ProductResponse>(`/products/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateProductRequest, signal?: AbortSignal) =>
    apiClient.post<ProductResponse>('/products', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest, signal?: AbortSignal) =>
    apiClient.patch<ProductResponse>(`/products/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/products/${id}`, { signal }).then((r) => r.data),
};
