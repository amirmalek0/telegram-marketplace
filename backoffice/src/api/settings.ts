import { apiClient } from './client';

export interface GeneralSettings { require_phone_verification: boolean }

export const settingsApi = {
  getGeneral: async () => (await apiClient.get<GeneralSettings>('/settings/general')).data,
  updateGeneral: async (require_phone_verification: boolean) => (
    await apiClient.patch<GeneralSettings>('/settings/general', { require_phone_verification })
  ).data,
};
