import { PaginatedResponse } from './common';

export interface FileResponse {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export type FilesPaginatedResponse = PaginatedResponse<FileResponse>;
