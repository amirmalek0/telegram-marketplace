import { PaginatedResponse } from './common';

export interface CreateCategoryRequest {
  title: string;
}

export interface UpdateCategoryRequest {
  title?: string;
  active?: boolean;
  sort_order?: number;
}

export interface ReorderItem {
  id: string;
  sort_order: number;
}

export interface ReorderRequest {
  items: ReorderItem[];
}

export interface CategoryResponse {
  id: string;
  title: string;
  icon_url: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export type CategoriesPaginatedResponse = PaginatedResponse<CategoryResponse>;
