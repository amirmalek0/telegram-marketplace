import { Icon } from '../ui/Icon'

export function TelegramRequired() {
  return (
    <main className="standalone-state" dir="rtl">
      <section className="construction-card">
        <span className="construction-icon"><Icon name="shop" size={34} /></span>
        <h1>فروشگاه تلگرام</h1>
        <p>برای ورود امن، این صفحه را از داخل تلگرام باز کنید.</p>
      </section>
    </main>
  )
}
