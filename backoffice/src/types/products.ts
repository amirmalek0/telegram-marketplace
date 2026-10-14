import { PaginatedResponse } from './common';

export type DeliveryType = 'file' | 'message' | 'inventory' | 'bundle' | 'api';
export type ProductStatus = 'active' | 'draft' | 'archived';

export interface CreateProductRequest {
  title: string;
  description: string;
  stars_price: number;
  category_id: string;
  delivery_type: DeliveryType;
  file_id?: string;
  file_ids?: string[];
  message_id?: string;
  inventory_id?: string;
  bundle_id?: string;
  api_id?: string;
  demo_url?: string;
  vip_only: boolean;
  repurchasable: boolean;
}

export interface UpdateProductRequest {
  title?: string;
  description?: string;
  stars_price?: number;
  category_id?: string;
  delivery_type?: DeliveryType;
  file_id?: string;
  file_ids?: string[];
  message_id?: string;
  inventory_id?: string;
  bundle_id?: string;
  api_id?: string;
  demo_url?: string;
  vip_only?: boolean;
  repurchasable?: boolean;
  status?: ProductStatus;
}

export interface ProductResponse {
  id: string;
  title: string;
  description: string;
  stars_price: number;
  category_id: string;
  image_url: string;
  delivery_type: DeliveryType;
  file_id?: string;
  file_ids?: string[];
  message_id?: string;
  inventory_id?: string;
  bundle_id?: string;
  api_id?: string;
  demo_url?: string;
  vip_only: boolean;
  repurchasable: boolean;
  views_count: number;
  status: ProductStatus;
  created_at: string;
}

export type ProductsPaginatedResponse = PaginatedResponse<ProductResponse>;
