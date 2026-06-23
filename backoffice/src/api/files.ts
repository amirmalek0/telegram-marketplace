import apiClient from './client';
import { FileResponse, FilesPaginatedResponse } from '@/types';

export const filesApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<FilesPaginatedResponse>('/files', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<FileResponse>(`/files/${id}`).then((r) => r.data),

  upload: (file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    return apiClient.post<FileResponse>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  delete: (id: string) =>
    apiClient.delete<void>(`/files/${id}`).then((r) => r.data),
};
