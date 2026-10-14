import { useState } from 'react'
import { requestPhoneAccess } from '@telegram-apps/sdk'
import { Icon } from '../ui/Icon'

interface Props { loading: boolean; error: string | null; onRefresh: () => void; preview?: string }

export function PhoneVerificationGate({ loading, error, onRefresh, preview }: Props) {
  const [requesting, setRequesting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const share = async () => {
    if (preview) { setNotice('در انتظار تأیید ربات؛ پس از دریافت شماره، دسترسی شما خودکار باز می‌شود.'); return }
    if (!requestPhoneAccess.isAvailable()) {
      setNotice('تلگرام را به‌روزرسانی کنید یا در گفت‌وگو با ربات دستور /verify را بفرستید و شماره خود را به اشتراک بگذارید.')
      return
    }
    setRequesting(true)
    setNotice(null)
    try {
      const result = await requestPhoneAccess({ timeout: 60000 })
      setNotice(result === 'sent' ? 'در انتظار تأیید ربات؛ پس از دریافت شماره، دسترسی شما خودکار باز می‌شود.' : 'اشتراک‌گذاری انجام نشد. برای ورود، شماره حساب تلگرام خود را به اشتراک بگذارید.')
      onRefresh()
    } catch {
      setNotice('اشتراک‌گذاری شماره انجام نشد. دوباره تلاش کنید یا از دستور /verify در ربات استفاده کنید.')
    } finally { setRequesting(false) }
  }

  const visibleNotice = notice || (preview === 'phone-waiting' ? 'در انتظار تأیید ربات؛ پس از دریافت شماره، دسترسی شما خودکار باز می‌شود.' : preview === 'phone-cancelled' ? 'اشتراک‌گذاری انجام نشد. برای ورود، شماره حساب تلگرام خود را به اشتراک بگذارید.' : preview === 'phone-unsupported' ? 'تلگرام را به‌روزرسانی کنید یا در گفت‌وگو با ربات دستور /verify را بفرستید و شماره خود را به اشتراک بگذارید.' : null)

  return <main className="standalone-state phone-verification" dir="rtl">
    <section className="phone-verification-card" aria-busy={loading || requesting}>
      <span className="phone-verification-icon"><Icon name="phone" size={28} /></span>
      <h1>{loading ? 'در حال بررسی دسترسی…' : error ? 'بررسی دسترسی' : 'تأیید شماره تلفن'}</h1>
      <p>{error || (loading ? 'لطفاً چند لحظه صبر کنید.' : 'برای استفاده از فروشگاه، شماره حساب تلگرام خود را با ربات به اشتراک بگذارید. شماره فقط برای حساب خود شما ثبت می‌شود.')}</p>
      {!loading && !error && <button className="phone-share-button" type="button" disabled={requesting} onClick={() => void share()}><Icon name="phone" size={18}/>{requesting ? 'در انتظار تلگرام…' : 'اشتراک‌گذاری شماره من'}</button>}
      {visibleNotice && <p className="phone-verification-notice" role="status">{visibleNotice}</p>}
      {!loading && <button className="phone-refresh-button" type="button" onClick={onRefresh}><Icon name="refresh" size={16}/>بررسی دوباره</button>}
      {!loading && !error && <small>شماره به‌صورت خودکار از تلگرام دریافت می‌شود؛ نیازی به وارد کردن کد پیامکی نیست.</small>}
    </section>
  </main>
}
