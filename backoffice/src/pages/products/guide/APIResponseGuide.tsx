import { GuidePath } from './GuideText';

const response = {
  success: true,
  data: {
    code: 'LICENSE-EXAMPLE-001',
    expires_at: '2027-01-01',
    credentials: { username: 'example_user', password: 'EXAMPLE-ONLY' },
    codes: ['LICENSE-EXAMPLE-001', 'LICENSE-EXAMPLE-002'],
  },
  internal_reference: 'provider-order-123',
};

export function APIResponseGuide() {
  return <section className="product-guide-api-help" aria-label="راهنمای پاسخ و خطای API">
    <h3>چطور فقط بخشی از پاسخ را به مشتری تحویل بدهم؟</h3>
    <ul className="product-guide-points">
      <li>در <GuidePath>محصولات ← اتصال API ← API جدید</GuidePath> یا فرم ویرایش اتصال، بخش <GuidePath>درخواست و پاسخ</GuidePath> را باز کنید.</li>
      <li>از ارائه‌دهنده، نمونه پاسخ موفق JSON را بگیرید. مقدار <GuidePath>مسیر پاسخ (اختیاری)</GuidePath> تعیین می‌کند کدام قسمت پاسخ به خریدار نمایش داده شود.</li>
      <li>این فیلد از JSONPath استفاده می‌کند: <code>$</code> یعنی ریشه پاسخ، نقطه برای ورود به یک فیلد و <code>[0]</code> برای اولین عضو آرایه است.</li>
    </ul>
    <div className="product-guide-code"><b>نمونه پاسخ سرویس</b><pre dir="ltr"><code>{JSON.stringify(response, null, 2)}</code></pre></div>
    <div className="product-guide-table"><table><thead><tr><th>مقدار مسیر پاسخ</th><th>چیزی که مشتری دریافت می‌کند</th></tr></thead><tbody>
      <tr><td><code>$.data.code</code></td><td><code>LICENSE-EXAMPLE-001</code> — فقط کد، بدون سایر فیلدها</td></tr>
      <tr><td><code>$.data.credentials.username</code></td><td><code>example_user</code> — فقط نام کاربری</td></tr>
      <tr><td><code>$.data.codes[0]</code></td><td>اولین کد آرایه؛ شماره‌گذاری از صفر شروع می‌شود.</td></tr>
      <tr><td><code>$.data.credentials</code></td><td>نام کاربری و رمز همین شیء، به شکل متن JSON؛ فقط وقتی هر دو باید تحویل شوند.</td></tr>
      <tr><td>خالی</td><td>کل بدنه پاسخ بدون استخراج تحویل داده می‌شود؛ ممکن است شامل اطلاعات داخلی سرویس باشد.</td></tr>
    </tbody></table></div>
    <ul className="product-guide-points">
      <li>برای مثال بالا، اگر محصول «کد فعال‌سازی» است، <code>$.data.code</code> را وارد و اتصال را ذخیره کنید؛ مشتری فقط همان کد را می‌بیند.</li>
      <li>خروجی متن، عدد و مقدار منطقی به متن تبدیل می‌شود؛ شیء یا آرایه به متن JSON تبدیل می‌شود. مقدار <code>null</code> خروجی خالی می‌دهد و لزوماً خطا محسوب نمی‌شود.</li>
      <li>مسیر پاسخ، قالب‌ساز متن یا کد JavaScript نیست. برای خروجی ترکیبیِ خوانا از ارائه‌دهنده بخواهید یک فیلد آماده مثل <code>delivery_text</code> برگرداند و همان فیلد را انتخاب کنید.</li>
    </ul>
    <h3>اگر درخواست یا استخراج پاسخ ناموفق شد چه می‌شود؟</h3>
    <ul className="product-guide-points">
      <li>قطع ارتباط، پایان مهلت درخواست، پاسخ غیر از <code>2xx</code>، پاسخ بیش از سقف مجاز، JSON نامعتبر یا مسیر JSONPath ناموجود می‌تواند تحویل را ناموفق کند.</li>
      <li>پرداخت موفق مشتری با خطای تحویل، خودکار ناموفق یا بازپرداخت نمی‌شود. تحویل آماده نیست و پیام موقتِ تلاش دوباره ثبت می‌شود؛ از مشتری نخواهید برای همان سفارش دوباره پرداخت کند.</li>
      <li>کار پس‌زمینه تحویل را دوباره امتحان می‌کند؛ برای تلاش ناموفق فاصله حدود یک دقیقه در نظر گرفته شده است. زمان دقیق به صف و دسترسی سرویس بستگی دارد و حل خودکار خطای تنظیمات تضمین نمی‌شود.</li>
      <li>مدیر در <GuidePath>مالی ← سفارش‌ها</GuidePath> سفارش و خریدار را شناسایی می‌کند؛ مسئول فنی log سرور و وضعیت سرویس مقصد را بررسی می‌کند. آدرس، اعتبار هدر، ساختار JSON و مسیر پاسخ را در <GuidePath>محصولات ← اتصال API</GuidePath> اصلاح کنید.</li>
      <li>درخواست تکراری همان <code>Idempotency-Key</code> را دارد. ارائه‌دهنده باید این کلید را رعایت کند تا تلاش مجدد، صدور کد یا هزینه دوباره ایجاد نکند؛ این موضوع را پیش از فروش با او هماهنگ کنید.</li>
      <li>پاسخ HTTP موفق با <code>{' {"success": false} '.trim()}</code> خودبه‌خود خطای کسب‌وکار شناخته نمی‌شود. قرارداد سرویس باید وضعیت HTTP و فیلد تحویل مناسب داشته باشد؛ فقط بررسی <code>success</code> توسط مدیر یا نمایش آن به مشتری کافی نیست.</li>
      <li>اگر مشکل ادامه داشت، پیگیری و جبران خرید را با مشتری انجام دهید. خطای تحویل به‌تنهایی پول را به حساب او برنمی‌گرداند.</li>
    </ul>
  </section>;
}
