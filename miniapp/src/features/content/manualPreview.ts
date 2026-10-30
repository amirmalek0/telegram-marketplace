import type { ManualPayment } from '../commerce/manual'

export type ManualPurpose = 'product' | 'vip_plan' | 'wallet_topup'
const purposes: ManualPurpose[] = ['product', 'vip_plan', 'wallet_topup']
const states = [
  ['awaiting_proof', 'فرم واریز و رسید'], ['receipt', 'رسید انتخاب‌شده'], ['submitting', 'ارسال رسید'],
  ['submitted', 'در انتظار بررسی'], ['approved', 'تأییدشده'], ['rejected', 'ردشده'], ['cancelled', 'لغوشده'],
  ['test-approved', 'تأیید آزمایشی'], ['loading', 'دریافت فرم'], ['cancel-confirm', 'تأیید لغو'], ['error', 'خطای ارسال'], ['test', 'پرداخت آزمایشی'],
] as const
export function manualScenarios(purpose: ManualPurpose) {
  const result = states.map(([state, label]) => ({ value: `manual-${purpose}-${state}`, label: `کارت‌به‌کارت — ${label}` }))
  if (purpose === 'product') result.push({value:'manual-product-coupon',label:'کارت‌به‌کارت — کد تخفیف تومان'}, {value:'manual-product-coupon-free',label:'کارت‌به‌کارت — تخفیف کامل'})
  if (purpose === 'vip_plan') result.push({ value: 'manual-vip_plan-upgrade', label: 'کارت‌به‌کارت — محاسبه ارتقای VIP' })
  return result
}
export function parseManualScenario(scenario: string): { purpose: ManualPurpose; state: string } | null {
  for (const purpose of purposes) {
    const state = scenario.slice(`manual-${purpose}-`.length)
    if (scenario.startsWith(`manual-${purpose}-`) && (states.some(([name]) => name === state) || purpose === 'vip_plan' && state === 'upgrade' || purpose === 'product' && ['coupon','coupon-free'].includes(state))) return { purpose, state }
  }
  return null
}

// Synthetic data only. Never fetch real customer receipts or destination cards
// for editor scenarios, and never use these IDs in a payment API request.
export function manualPreviewPayment(purpose: ManualPurpose, state = 'awaiting_proof'): ManualPayment {
  const status = state === 'test-approved' || state === 'coupon-free' ? 'approved' : ['submitted', 'approved', 'rejected', 'cancelled'].includes(state) ? state : 'awaiting_proof'
  return {
    id: `preview-manual-${purpose}-${state}`, purpose, target_id: `preview-${purpose}`,
    title: purpose === 'product' ? 'محصول نمونه' : purpose === 'vip_plan' ? 'اشتراک ویژه نمونه' : 'بسته اعتبار نمونه',
    discount_toman: state === 'coupon' ? 50000 : state === 'coupon-free' ? 150000 : 0, coupon_code: state.startsWith('coupon') ? 'WELCOME' : '',
    toman: state === 'coupon' ? 100000 : state === 'coupon-free' ? 0 : 150000, original_toman: state === 'upgrade' ? 200000 : 150000, credit_toman: state === 'upgrade' ? 50000 : 0,
    remaining_days: state === 'upgrade' ? 12 : 0, wallet_stars: purpose === 'wallet_topup' ? 100 : 0,
    expires_at: '2030-01-02T12:00:00Z', created_at: '2026-10-25T12:00:00Z', status, is_test: state === 'test' || state === 'test-approved',
    cards: [{ id: 'preview-card', number: '0000000000000000', owner: 'پیش‌نمایش — واریز نکنید', bank: { key: 'Saman', name: 'بانک سامان' }, active: true }],
    instructions: 'راهنمای واریز مدیر در این قسمت نمایش داده می‌شود. این اطلاعات نمونه است؛ واریز نکنید.',
    transaction_id: status === 'awaiting_proof' ? '' : 'PREVIEW-123456', destination_card_id: 'preview-card',
    has_receipt: state === 'receipt' || status !== 'awaiting_proof', review_note: status === 'rejected' ? 'دلیل بررسی مدیر در این قسمت نمایش داده می‌شود.' : '',
  }
}

export function previewPaymentMethods(scenario: string) {
  return { telegram_stars: scenario !== 'methods-card-only' && scenario !== 'methods-disabled', card_to_card: scenario !== 'methods-stars-only' && scenario !== 'methods-disabled' }
}

export const methodScenarios = [
  { value: 'checkout-both', label: 'نمایش پرداخت — هر دو قیمت و انتخاب روش' },
  { value: 'checkout-stars_first', label: 'نمایش پرداخت — Stars در اولویت' },
  { value: 'checkout-toman_first', label: 'نمایش پرداخت — تومان در اولویت' },
  { value: 'methods-card-only', label: 'روش پرداخت — فقط کارت‌به‌کارت' },
  { value: 'methods-stars-only', label: 'روش پرداخت — فقط Stars' },
  { value: 'methods-disabled', label: 'روش پرداخت — روش‌های خارجی غیرفعال' },
]
export const manualHistoryScenarios = [
  { value: 'manual-history', label: 'سوابق کارت‌به‌کارت — همه وضعیت‌ها' },
  { value: 'manual-history-loading', label: 'سوابق کارت‌به‌کارت — دریافت' },
  { value: 'manual-history-error', label: 'سوابق کارت‌به‌کارت — خطا' },
  { value: 'manual-history-pages', label: 'سوابق کارت‌به‌کارت — صفحه‌بندی' },
]
