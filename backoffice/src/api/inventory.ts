import apiClient from './client';
import {
  CreateInventoryRequest,
  UpdateInventoryRequest,
  BulkAddItemsRequest,
  InventoryResponse,
  InventoryItemResponse,
  InventoriesPaginatedResponse,
} from '@/types';

export const inventoryApi = {
  list: (params?: { page?: number; per_page?: number }, signal?: AbortSignal) =>
    apiClient.get<InventoriesPaginatedResponse>('/inventories', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<InventoryResponse>(`/inventories/${id}`, { signal }).then((r) => r.data),

  // Backend returns a plain array (not paginated) for items
  listItems: (id: string, signal?: AbortSignal) =>
    apiClient.get<InventoryItemResponse[]>(`/inventories/${id}/items`, { signal }).then((r) => r.data),

  create: (data: CreateInventoryRequest, signal?: AbortSignal) =>
    apiClient.post<InventoryResponse>('/inventories', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateInventoryRequest, signal?: AbortSignal) =>
    apiClient.patch<InventoryResponse>(`/inventories/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/inventories/${id}`, { signal }).then((r) => r.data),

  bulkAddItems: (id: string, data: BulkAddItemsRequest, signal?: AbortSignal) =>
    apiClient.post<InventoryItemResponse[]>(`/inventories/${id}/items`, data, { signal }).then((r) => r.data),

  deleteItem: (inventoryId: string, itemId: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/inventories/${inventoryId}/items/${itemId}`, { signal }).then((r) => r.data),
};
