import { apiClient } from './client';

export interface UserPhoto { id: string; url: string; width: number; height: number; saved_at: string; current: boolean; }
export interface PhotoGallery { photos: UserPhoto[]; total: number; sync: { status: 'pending' | 'syncing' | 'ready' | 'error'; last_synced_at: string | null; error: string }; }
export const userPhotosApi = {
  list: async (id: string, offset = 0, signal?: AbortSignal) => (await apiClient.get<PhotoGallery>(`/user/${id}/photos`, { params: { offset }, signal })).data,
  sync: async (id: string) => { await apiClient.post(`/user/${id}/photos/sync`); },
};
