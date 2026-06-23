import apiClient from './client';
import {
  CreateApiRequest,
  UpdateApiRequest,
  ApiResponse,
  ApisPaginatedResponse,
} from '@/types';

export const apisApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<ApisPaginatedResponse>('/apis', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse>(`/apis/${id}`).then((r) => r.data),

  create: (data: CreateApiRequest) =>
    apiClient.post<ApiResponse>('/apis', data).then((r) => r.data),

  update: (id: string, data: UpdateApiRequest) =>
    apiClient.patch<ApiResponse>(`/apis/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/apis/${id}`).then((r) => r.data),
};
