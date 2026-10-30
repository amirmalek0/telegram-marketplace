export interface Bank { key: string; name: string }
export interface BankCard { id: string; number: string; owner: string; bank: Bank; active: boolean }
export interface ManualConfig { enabled: boolean; mode: 'random' | 'fixed' | 'multiple'; fixed_card_id: string; instructions: string; approval_message: string; rejection_message: string; cards: BankCard[]; revision: number }
export interface ManualPrice { purpose: string; target_id: string; title: string; toman_price: number; stars: number; status: string }
export interface ManualPayment {
 original_toman: number; discount_toman: number; coupon_code: string;
  id: string; order_id?: string; user_id: string; user_name: string; username: string; purpose: string; target_id: string; title: string; toman: number;
  status: string; is_test: boolean; cards: BankCard[]; instructions: string; transaction_id: string; destination_card_id: string;
  has_receipt: boolean; review_note: string; reviewed_by?: string; reviewed_at?: string; created_at: string; submitted_at?: string;
}
export const statusLabels: Record<string, string> = { awaiting_proof: 'منتظر رسید', submitted: 'نیازمند بررسی', approved: 'تأییدشده', rejected: 'ردشده', cancelled: 'لغوشده' };
export const purposeLabels: Record<string, string> = { product: 'محصول', vip_plan: 'اشتراک VIP', wallet_topup: 'شارژ کیف پول' };
export const toman = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;
