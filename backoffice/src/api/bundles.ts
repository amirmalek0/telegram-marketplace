import apiClient from './client';
import {
  CreateBundleRequest,
  UpdateBundleRequest,
  BundleResponse,
  BundlesPaginatedResponse,
} from '@/types';

export const bundlesApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<BundlesPaginatedResponse>('/bundles', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<BundleResponse>(`/bundles/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateBundleRequest, signal?: AbortSignal) =>
    apiClient.post<BundleResponse>('/bundles', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateBundleRequest, signal?: AbortSignal) =>
    apiClient.patch<BundleResponse>(`/bundles/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/bundles/${id}`, { signal }).then((r) => r.data),
};
