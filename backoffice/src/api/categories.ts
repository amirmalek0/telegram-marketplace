import apiClient from './client';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ReorderRequest,
  CategoryResponse,
  CategoriesPaginatedResponse,
} from '@/types';

export const categoriesApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<CategoriesPaginatedResponse>('/categories', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<CategoryResponse>(`/categories/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateCategoryRequest, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('title', data.title);
    return apiClient.post<CategoryResponse>('/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  update: (id: string, data: UpdateCategoryRequest, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponse>(`/categories/${id}`, data, { signal }).then((r) => r.data),

  reorder: (data: ReorderRequest, signal?: AbortSignal) =>
    apiClient.patch<void>('/categories/reorder', data, { signal }).then((r) => r.data),

  uploadIcon: (id: string, file: File, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('icon', file);
    return apiClient.post<CategoryResponse>(`/categories/${id}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/categories/${id}`, { signal }).then((r) => r.data),
};
