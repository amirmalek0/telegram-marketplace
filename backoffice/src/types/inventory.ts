import { PaginatedResponse } from './common';

export interface CreateInventoryRequest {
  name: string;
}

export interface UpdateInventoryRequest {
  name?: string;
}

export interface BulkAddItemsRequest {
  values: string[];
}

export interface InventoryResponse {
  id: string;
  name: string;
  created_at: string;
}

export interface InventoryItemResponse {
  id: string;
  inventory_id: string;
  value: string;
  status: string;
  sold_at?: string;
  order_id?: string;
  user_id?: string;
  created_at: string;
}

export type InventoriesPaginatedResponse = PaginatedResponse<InventoryResponse>;
export type InventoryItemsPaginatedResponse = PaginatedResponse<InventoryItemResponse>;
