export type RewardTrigger = 'bot_open' | 'phone_verified' | 'first_purchase'
export interface ReferralSummary {
  enabled: boolean
  inviter_stars: number
  invitee_stars: number
  reward_trigger: RewardTrigger
  link: string
  total: number
  rewarded: number
  earned_stars: number
  invitation: null | { reward_trigger: RewardTrigger; invitee_stars: number; rewarded_at: string | null }
}
