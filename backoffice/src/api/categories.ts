import apiClient from './client';
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ReorderRequest,
  CategoryResponse,
  CategoriesPaginatedResponse,
} from '@/types';

export const categoriesApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<CategoriesPaginatedResponse>('/categories', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<CategoryResponse>(`/categories/${id}`).then((r) => r.data),

  create: (data: CreateCategoryRequest) => {
    const formData = new FormData();
    formData.append('title', data.title);
    return apiClient.post<CategoryResponse>('/categories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.patch<CategoryResponse>(`/categories/${id}`, data).then((r) => r.data),

  reorder: (data: ReorderRequest) =>
    apiClient.patch<void>('/categories/reorder', data).then((r) => r.data),

  uploadIcon: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('icon', file);
    return apiClient.post<CategoryResponse>(`/categories/${id}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  delete: (id: string) =>
    apiClient.delete<void>(`/categories/${id}`).then((r) => r.data),
};
