import apiClient from './client';
import {
  CreateMessageRequest,
  UpdateMessageRequest,
  MessageResponse,
  MessagesPaginatedResponse,
} from '@/types';

export const messagesApi = {
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<MessagesPaginatedResponse>('/messages', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<MessageResponse>(`/messages/${id}`).then((r) => r.data),

  create: (data: CreateMessageRequest) =>
    apiClient.post<MessageResponse>('/messages', data).then((r) => r.data),

  update: (id: string, data: UpdateMessageRequest) =>
    apiClient.patch<MessageResponse>(`/messages/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/messages/${id}`).then((r) => r.data),
};
