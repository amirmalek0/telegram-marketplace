import apiClient from './client';
import {
  CreateProductRequest,
  UpdateProductRequest,
  ProductResponse,
  ProductsPaginatedResponse,
} from '@/types';

export const productsApi = {
  list: (params?: { page?: number; per_page?: number; category_id?: string }, signal?: AbortSignal) =>
    apiClient.get<ProductsPaginatedResponse>('/product', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<ProductResponse>(`/product/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateProductRequest, signal?: AbortSignal) =>
    apiClient.post<ProductResponse>('/product', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest, signal?: AbortSignal) =>
    apiClient.patch<ProductResponse>(`/product/${id}`, data, { signal }).then((r) => r.data),

  uploadImage: (id: string, file: File, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post<ProductResponse>(`/product/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/product/${id}`, { signal }).then((r) => r.data),
};
