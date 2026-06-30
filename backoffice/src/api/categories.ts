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
    apiClient.get<CategoriesPaginatedResponse>('/category', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<CategoryResponse>(`/category/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateCategoryRequest, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('title', data.title);
    return apiClient.post<CategoryResponse>('/category', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  update: (id: string, data: UpdateCategoryRequest, signal?: AbortSignal) =>
    apiClient.patch<CategoryResponse>(`/category/${id}`, data, { signal }).then((r) => r.data),

  reorder: (data: ReorderRequest, signal?: AbortSignal) =>
    apiClient.patch<void>('/category/reorder', data, { signal }).then((r) => r.data),

  uploadIcon: (id: string, file: File, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('icon', file);
    return apiClient.post<CategoryResponse>(`/category/${id}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/category/${id}`, { signal }).then((r) => r.data),
};
