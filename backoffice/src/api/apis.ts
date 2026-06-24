import apiClient from './client';
import {
  CreateApiRequest,
  UpdateApiRequest,
  ApiResponse,
  ApisPaginatedResponse,
} from '@/types';

export const apisApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<ApisPaginatedResponse>('/apis', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse>(`/apis/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateApiRequest, signal?: AbortSignal) =>
    apiClient.post<ApiResponse>('/apis', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateApiRequest, signal?: AbortSignal) =>
    apiClient.patch<ApiResponse>(`/apis/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/apis/${id}`, { signal }).then((r) => r.data),
};
