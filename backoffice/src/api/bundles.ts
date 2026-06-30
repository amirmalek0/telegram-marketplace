import apiClient from './client';
import {
  CreateBundleRequest,
  UpdateBundleRequest,
  BundleResponse,
  BundlesPaginatedResponse,
} from '@/types';

export const bundlesApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<BundlesPaginatedResponse>('/bundle', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<BundleResponse>(`/bundle/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateBundleRequest, signal?: AbortSignal) =>
    apiClient.post<BundleResponse>('/bundle', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateBundleRequest, signal?: AbortSignal) =>
    apiClient.patch<BundleResponse>(`/bundle/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/bundle/${id}`, { signal }).then((r) => r.data),
};
