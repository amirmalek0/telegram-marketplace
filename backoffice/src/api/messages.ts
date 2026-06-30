import apiClient from './client';
import {
  CreateMessageRequest,
  UpdateMessageRequest,
  MessageResponse,
  MessagesPaginatedResponse,
} from '@/types';

export const messagesApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<MessagesPaginatedResponse>('/message', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<MessageResponse>(`/message/${id}`, { signal }).then((r) => r.data),

  create: (data: CreateMessageRequest, signal?: AbortSignal) =>
    apiClient.post<MessageResponse>('/message', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateMessageRequest, signal?: AbortSignal) =>
    apiClient.patch<MessageResponse>(`/message/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/message/${id}`, { signal }).then((r) => r.data),
};
