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
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<AdminsListResponse>('/admins', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<AdminResponse>(`/admins/${id}`).then((r) => r.data),

  create: (data: CreateAdminRequest) =>
    apiClient.post<AdminResponse>('/admins', data).then((r) => r.data),

  update: (id: string, data: UpdateAdminRequest) =>
    apiClient.patch<AdminResponse>(`/admins/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/admins/${id}`).then((r) => r.data),
};
