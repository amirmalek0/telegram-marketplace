import { apiClient } from './client';

export interface ReferralSettings {
  enabled: boolean;
  inviter_stars: number;
  invitee_stars: number;
  reward_trigger: 'bot_open' | 'phone_verified' | 'first_purchase';
  inviter_message: string;
  invitee_message: string;
}
export const referralsApi = {
  settings: async () => (await apiClient.get<ReferralSettings>('/settings/referrals')).data,
  save: async (settings: ReferralSettings) => (await apiClient.put<ReferralSettings>('/settings/referrals', settings)).data,
};
