export interface EditorScenarioOption {
  value: string
  label: string
}

const shop: EditorScenarioOption[] = [
  { value: 'content', label: 'فروشگاه — دارای محتوا' },
  { value: 'empty-categories', label: 'فروشگاه — بدون دسته‌بندی' },
  { value: 'empty-products', label: 'فروشگاه — بدون محصول' },
  { value: 'empty', label: 'فروشگاه — کاملاً خالی' },
  { value: 'loading', label: 'فروشگاه — در حال بارگذاری' },
  { value: 'error', label: 'فروشگاه — خطای دریافت' },
  { value: 'phone-required', label: 'ورود — الزام تأیید شماره' },
  { value: 'phone-loading', label: 'ورود — بررسی دسترسی' },
  { value: 'phone-error', label: 'ورود — خطای بررسی دسترسی' },
  { value: 'phone-waiting', label: 'ورود — انتظار تأیید ربات' },
  { value: 'phone-cancelled', label: 'ورود — لغو اشتراک شماره' },
  { value: 'phone-unsupported', label: 'ورود — تلگرام قدیمی' },
]

const category: EditorScenarioOption[] = [
  { value: 'content', label: 'دسته‌بندی — دارای محصول' },
  { value: 'empty', label: 'دسته‌بندی — بدون محصول' },
  { value: 'loading', label: 'دسته‌بندی — در حال بارگذاری' },
  { value: 'error', label: 'دسته‌بندی — خطای دریافت' },
  { value: 'not-found', label: 'دسته‌بندی — پیدا نشد' },
]

const product: EditorScenarioOption[] = [
  { value: 'content', label: 'محصول — حالت عادی' },
  { value: 'coupon-empty', label: 'محصول — ورود کد تخفیف' },
  { value: 'coupon-applied', label: 'محصول — کد اعمال‌شده' },
  { value: 'coupon-free', label: 'محصول — تخفیف کامل' },
  { value: 'coupon-error', label: 'محصول — کد نامعتبر' },
  { value: 'coupon-checking', label: 'محصول — بررسی کد تخفیف' },
  { value: 'vip', label: 'محصول — رایگان برای VIP' },
  { value: 'purchased', label: 'محصول — خرید یک‌باره انجام‌شده' },
  { value: 'access', label: 'محصول — دسترسی خرید' },
  { value: 'payment-test', label: 'محصول — پرداخت آزمایشی' },
  { value: 'success', label: 'محصول — پیام موفقیت' },
  { value: 'purchase-error', label: 'محصول — خطای پرداخت' },
  { value: 'access-error', label: 'محصول — خطای دسترسی' },
  { value: 'loading', label: 'محصول — در حال بارگذاری' },
  { value: 'not-found', label: 'محصول — پیدا نشد' },
]

const orders: EditorScenarioOption[] = [
  { value: 'content', label: 'سفارش‌ها — همه وضعیت‌ها' },
  { value: 'empty', label: 'سفارش‌ها — بدون سفارش' },
  { value: 'loading', label: 'سفارش‌ها — در حال بارگذاری' },
  { value: 'error', label: 'سفارش‌ها — خطای دریافت' },
]

const downloads: EditorScenarioOption[] = [
  { value: 'content', label: 'دانلودها — همه وضعیت‌ها' },
  { value: 'empty', label: 'دانلودها — بدون محتوا' },
  { value: 'loading', label: 'دانلودها — در حال بارگذاری' },
  { value: 'error', label: 'دانلودها — خطای دریافت' },
]

const tickets: EditorScenarioOption[] = [
  { value: 'content', label: 'تیکت‌ها — همه وضعیت‌ها' },
  { value: 'empty', label: 'تیکت‌ها — بدون تیکت' },
  { value: 'filtered-empty', label: 'تیکت‌ها — فیلتر بدون نتیجه' },
  { value: 'loading', label: 'تیکت‌ها — در حال بارگذاری' },
  { value: 'error', label: 'تیکت‌ها — خطای دریافت' },
]

const ticketThread: EditorScenarioOption[] = [
  { value: 'open', label: 'گفت‌وگو — باز' },
  { value: 'closed', label: 'گفت‌وگو — بسته' },
  { value: 'loading', label: 'گفت‌وگو — در حال بارگذاری' },
  { value: 'error', label: 'گفت‌وگو — خطا / پیدا نشد' },
]

const newTicket: EditorScenarioOption[] = [
  { value: 'form', label: 'تیکت جدید — فرم آماده' },
  { value: 'loading', label: 'تیکت جدید — دریافت دسته‌ها' },
  { value: 'empty', label: 'تیکت جدید — بدون دسته‌بندی' },
  { value: 'error', label: 'تیکت جدید — خطای دسته‌بندی' },
  { value: 'submitting', label: 'تیکت جدید — در حال ارسال' },
]

const profile: EditorScenarioOption[] = [
  { value: 'vip', label: 'پروفایل — کاربر VIP' },
  { value: 'referral-open', label: 'دعوت — پاداش ورود' },
  { value: 'referral-purchase', label: 'دعوت — پاداش خرید' },
  { value: 'referral-empty', label: 'دعوت — بدون دعوت' },
  { value: 'referral-pending', label: 'دعوت — هدیه در انتظار تأیید شماره' },
  { value: 'referral-rewarded', label: 'دعوت — هدیه واریزشده' },
  { value: 'referral-disabled', label: 'دعوت — غیرفعال' },
  { value: 'referral-loading', label: 'دعوت — در حال بارگذاری' },
  { value: 'referral-error', label: 'دعوت — خطای دریافت' },
  { value: 'standard', label: 'پروفایل — کاربر عادی' },
  { value: 'empty-wallet', label: 'پروفایل — کیف پول خالی' },
  { value: 'payment-test', label: 'پروفایل — پرداخت آزمایشی' },
  { value: 'success', label: 'پروفایل — پیام موفقیت' },
  { value: 'error-message', label: 'پروفایل — پیام خطا' },
  { value: 'loading', label: 'پروفایل — در حال بارگذاری' },
  { value: 'unavailable', label: 'پروفایل — در دسترس نیست' },
]

export function editorScenariosForPath(pathname: string): EditorScenarioOption[] {
  if (pathname === '/notifications') return [
    { value: 'content', label: 'اعلان‌ها — خوانده‌شده و جدید' },
    { value: 'empty', label: 'اعلان‌ها — صندوق خالی' },
    { value: 'loading', label: 'اعلان‌ها — در حال دریافت' },
    { value: 'error', label: 'اعلان‌ها — خطای دریافت' },
  ]
  if (pathname === '/') return shop
  if (/^\/categories\//.test(pathname)) return category
  if (/^\/products\//.test(pathname)) return product
  if (pathname === '/orders') return orders
  if (pathname === '/downloads') return downloads
  if (pathname === '/vip') return [...profile.filter(item => !item.value.startsWith('referral-')).map((item) => ({ ...item, label: item.label.replace('پروفایل', 'VIP') })), { value: 'no-plans', label: 'VIP — بدون پلن' }]
  if (pathname === '/wallet') return [...profile.filter(item => !item.value.startsWith('referral-')).map((item) => ({ ...item, label: item.label.replace('پروفایل', 'کیف پول') })), { value: 'no-packs', label: 'کیف پول — بدون بسته شارژ' }]
  if (pathname === '/tickets/new') return newTicket
  if (/^\/tickets\/[^/]+/.test(pathname)) return ticketThread
  if (pathname === '/tickets') return tickets
  if (pathname === '/profile') return profile
  return [{ value: 'content', label: 'حالت پیش‌فرض' }]
}
