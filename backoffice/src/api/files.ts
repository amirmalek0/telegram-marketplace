import apiClient from './client';
import { FileResponse, FilesPaginatedResponse } from '@/types';

export const filesApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<FilesPaginatedResponse>('/file', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<FileResponse>(`/file/${id}`, { signal }).then((r) => r.data),

  upload: (file: File, name?: string, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    return apiClient.post<FileResponse>('/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal,
    }).then((r) => r.data);
  },

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/file/${id}`, { signal }).then((r) => r.data),
};
