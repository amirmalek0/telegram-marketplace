import { PaginatedResponse } from './common';

export interface CreateMessageRequest {
  name: string;
  content: string;
}

export interface UpdateMessageRequest {
  name?: string;
  content?: string;
}

export interface MessageResponse {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

export type MessagesPaginatedResponse = PaginatedResponse<MessageResponse>;
