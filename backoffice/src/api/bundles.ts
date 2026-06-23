import apiClient from './client';
import {
  CreateBundleRequest,
  UpdateBundleRequest,
  BundleResponse,
  BundlesPaginatedResponse,
} from '@/types';

export const bundlesApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<BundlesPaginatedResponse>('/bundles', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<BundleResponse>(`/bundles/${id}`).then((r) => r.data),

  create: (data: CreateBundleRequest) =>
    apiClient.post<BundleResponse>('/bundles', data).then((r) => r.data),

  update: (id: string, data: UpdateBundleRequest) =>
    apiClient.patch<BundleResponse>(`/bundles/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/bundles/${id}`).then((r) => r.data),
};
