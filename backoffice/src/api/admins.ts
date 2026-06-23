import apiClient from './client';
import {
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminResponse,
  AdminsPaginatedResponse,
} from '@/types';

export const adminsApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<AdminsPaginatedResponse>('/admins', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<AdminResponse>(`/admins/${id}`).then((r) => r.data),

  create: (data: CreateAdminRequest) =>
    apiClient.post<AdminResponse>('/admins', data).then((r) => r.data),

  update: (id: string, data: UpdateAdminRequest) =>
    apiClient.patch<AdminResponse>(`/admins/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/admins/${id}`).then((r) => r.data),
};
