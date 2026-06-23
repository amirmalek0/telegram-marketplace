import { PaginatedResponse } from './common';

export interface CreateMessageRequest {
  content: string;
}

export interface UpdateMessageRequest {
  content?: string;
}

export interface MessageResponse {
  id: string;
  content: string;
  created_at: string;
}

export type MessagesPaginatedResponse = PaginatedResponse<MessageResponse>;
