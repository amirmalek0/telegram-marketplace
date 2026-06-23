import { PaginatedResponse } from './common';

export interface CreateAdminRequest {
  username: string;
  password: string;
}

export interface UpdateAdminRequest {
  username?: string;
  password?: string;
  is_active?: boolean;
}

export interface AdminResponse {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export type AdminsPaginatedResponse = PaginatedResponse<AdminResponse>;
