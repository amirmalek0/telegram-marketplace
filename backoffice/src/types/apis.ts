import { PaginatedResponse } from './common';

export type HttpMethod = 'GET' | 'POST';

export interface HeaderInput {
  key: string;
  value: string;
}

export interface CreateApiRequest {
  name: string;
  url: string;
  method: HttpMethod;
  body?: string;
  response_path?: string;
  headers?: HeaderInput[];
}

export interface UpdateApiRequest {
  name?: string;
  url?: string;
  method?: HttpMethod;
  body?: string;
  response_path?: string;
  headers?: HeaderInput[];
}

export interface ApiResponse {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  body?: string;
  response_path?: string;
  headers: HeaderInput[];
  created_at: string;
}

export type ApisPaginatedResponse = PaginatedResponse<ApiResponse>;
