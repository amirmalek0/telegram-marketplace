import apiClient from './client';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductsPaginatedResponse,
} from '@/types';

export const productsApi = {
  list: (params?: { page?: number; per_page?: number; category_id?: string }) =>
    apiClient.get<ProductsPaginatedResponse>('/products', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ProductResponse>(`/products/${id}`).then((r) => r.data),

  create: (data: CreateProductRequest) =>
    apiClient.post<ProductResponse>('/products', data).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.patch<ProductResponse>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/products/${id}`).then((r) => r.data),
};
