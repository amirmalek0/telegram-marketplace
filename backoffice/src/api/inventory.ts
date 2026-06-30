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
    apiClient.get<InventoriesPaginatedResponse>('/inventory', { params, signal }).then((r) => r.data),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<InventoryResponse>(`/inventory/${id}`, { signal }).then((r) => r.data),

  // Backend returns a plain array (not paginated) for items
  listItems: (id: string, signal?: AbortSignal) =>
    apiClient.get<InventoryItemResponse[]>(`/inventory/${id}/item`, { signal }).then((r) => r.data),

  create: (data: CreateInventoryRequest, signal?: AbortSignal) =>
    apiClient.post<InventoryResponse>('/inventory', data, { signal }).then((r) => r.data),

  update: (id: string, data: UpdateInventoryRequest, signal?: AbortSignal) =>
    apiClient.patch<InventoryResponse>(`/inventory/${id}`, data, { signal }).then((r) => r.data),

  delete: (id: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/inventory/${id}`, { signal }).then((r) => r.data),

  bulkAddItems: (id: string, data: BulkAddItemsRequest, signal?: AbortSignal) =>
    apiClient.post<InventoryItemResponse[]>(`/inventory/${id}/item`, data, { signal }).then((r) => r.data),

  deleteItem: (inventoryId: string, itemId: string, signal?: AbortSignal) =>
    apiClient.delete<void>(`/inventory/${inventoryId}/item/${itemId}`, { signal }).then((r) => r.data),
};
