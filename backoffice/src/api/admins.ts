import apiClient from './client';
import {
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminResponse,
} from '@/types';

// Backend returns { admins: [...], total, page, limit, total_pages }
interface AdminsListResponse {
  admins: AdminResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const adminsApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<AdminsListResponse>('/admins', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<AdminResponse>(`/admins/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateAdminRequest, signal?: AbortSignal) =>
    apiClient.post<AdminResponse>('/admins', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateAdminRequest, signal?: AbortSignal) =>
    apiClient.put<AdminResponse>(`/admins/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/admins/${id}`, { signal }).then((r) => r.data),
};
