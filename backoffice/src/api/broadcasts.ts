import apiClient from './client';
import type { PaginatedResponse } from '@/types/common';

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  published_at: string;
  archived_at?: string;
  read_count: number;
}

export const broadcastsApi = {
  list: (page: number, signal?: AbortSignal) => apiClient.get<PaginatedResponse<Broadcast>>('/broadcast', { params: { page, per_page: 20 }, signal }).then(r => r.data),
  publish: (data: { title: string; message: string; request_id: string }) => apiClient.post<Broadcast>('/broadcast', data).then(r => r.data),
  archive: (id: string) => apiClient.delete(`/broadcast/${id}`),
};
