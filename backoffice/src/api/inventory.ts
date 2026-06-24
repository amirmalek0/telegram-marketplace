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
  list: (params?: { page?: number; per_page?: number }) =>
    apiClient.get<InventoriesPaginatedResponse>('/inventories', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<InventoryResponse>(`/inventories/${id}`).then((r) => r.data),

  // Backend returns a plain array (not paginated) for items
  listItems: (id: string) =>
    apiClient.get<InventoryItemResponse[]>(`/inventories/${id}/items`).then((r) => r.data),

  create: (data: CreateInventoryRequest) =>
    apiClient.post<InventoryResponse>('/inventories', data).then((r) => r.data),

  update: (id: string, data: UpdateInventoryRequest) =>
    apiClient.patch<InventoryResponse>(`/inventories/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete<void>(`/inventories/${id}`).then((r) => r.data),

  bulkAddItems: (id: string, data: BulkAddItemsRequest) =>
    apiClient.post<InventoryItemResponse[]>(`/inventories/${id}/items`, data).then((r) => r.data),

  deleteItem: (inventoryId: string, itemId: string) =>
    apiClient.delete<void>(`/inventories/${inventoryId}/items/${itemId}`).then((r) => r.data),
};
