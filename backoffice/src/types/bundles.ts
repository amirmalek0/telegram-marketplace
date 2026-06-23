import { PaginatedResponse } from './common';

export interface CreateBundleRequest {
  name: string;
  file_id?: string;
  message_id?: string;
  inventory_id?: string;
}

export interface UpdateBundleRequest {
  name?: string;
  file_id?: string | null;
  message_id?: string | null;
  inventory_id?: string | null;
}

export interface BundleResponse {
  id: string;
  name: string;
  file_id?: string;
  message_id?: string;
  inventory_id?: string;
  created_at: string;
}

export type BundlesPaginatedResponse = PaginatedResponse<BundleResponse>;
