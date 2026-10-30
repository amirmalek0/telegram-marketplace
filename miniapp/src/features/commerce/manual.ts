export interface BankCard { id: string; number: string; owner: string; bank: { key: string; name: string }; active: boolean }
export interface ManualPayment {
 discount_toman?: number; coupon_code?: string;
  original_toman: number; credit_toman: number; remaining_days: number; wallet_stars: number; expires_at: string;
  id: string; order_id?: string; purpose: string; target_id: string; title: string; toman: number; status: string; is_test: boolean;
  cards: BankCard[]; instructions: string; transaction_id: string; destination_card_id: string; has_receipt: boolean; review_note: string;
  created_at: string; submitted_at?: string;
}
export const manualStatus: Record<string, string> = { awaiting_proof: 'در انتظار ارسال رسید', submitted: 'در انتظار تأیید مدیر', approved: 'پرداخت تأیید شد', rejected: 'پرداخت تأیید نشد', cancelled: 'پرداخت لغو شد' }
export const formatToman = (value: number) => `${value.toLocaleString('fa-IR')} تومان`
