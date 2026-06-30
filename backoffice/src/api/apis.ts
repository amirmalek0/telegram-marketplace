import apiClient from './client';
import {
  CreateApiRequest,
  UpdateApiRequest,
  ApiResponse,
  ApisPaginatedResponse,
} from '@/types';

export const apisApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<ApisPaginatedResponse>('/api', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse>(`/api/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateApiRequest, signal?: AbortSignal) =>
    apiClient.post<ApiResponse>('/api', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateApiRequest, signal?: AbortSignal) =>
    apiClient.patch<ApiResponse>(`/api/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/api/${id}`, { signal }).then((r) => r.data),
};
