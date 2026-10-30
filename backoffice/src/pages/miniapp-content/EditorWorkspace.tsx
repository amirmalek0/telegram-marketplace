import type { ReactNode } from 'react';
import { BookOpen, ChevronDown, ExternalLink, ListFilter, RefreshCw, Smartphone, Type } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import './editor-workspace.css';
import './editor-refinements.css';

interface Props {
  connected: boolean;
  connectionSlow: boolean;
  page: { scenario: string; scenarios: { value: string; label: string }[] } | null;
  onScenario: (scenario: string) => void;
  onReload: () => void;
  onOpen: () => void;
  onCatalog: () => void;
  controls: ReactNode;
  children: ReactNode;
}

export function EditorWorkspace({ connected, connectionSlow, page, onScenario, onReload, onOpen, onCatalog, controls, children }: Props) {
  return <div className="miniapp-editor-workbench">
    <div className="editor-studio-grid">
      <aside className="editor-inspector" aria-label="تنظیمات ظاهر مینی‌اپ">
        {controls}
        <details className="editor-help">
          <summary><BookOpen size={16} /><span>راهنما و میانبرها</span><ChevronDown size={16} /></summary>
          <div className="editor-help-body">
            <p>با لینک‌ها و نوار پایین پیش‌نمایش بین صفحه‌ها جابه‌جا شوید. از «حالت صفحه» محتوا، حالت خالی، خطا و سایر وضعیت‌ها را ببینید.</p>
            <p>برای ویرایش، روی متن خط‌چین‌دار کلیک کنید. متن لینک و دکمه با <kbd>⌥ + کلیک</kbd> در مک و <kbd>Alt + کلیک</kbd> در ویندوز ویرایش می‌شود. «همه متن‌ها» برای جست‌وجوی متن‌های پنهان است.</p>
            <p>در صفحه محصول، VIP یا کیف پول، حالت‌های «کارت‌به‌کارت» را برای فرم رسید، انتظار بررسی، تأیید، رد، لغو و آزمون انتخاب کنید. پیش‌نمایش خرید و رسید واقعی ثبت نمی‌کند. کارت‌ها، راهنمای واریز و متن پیام بات در «پرداخت‌ها ← کارت‌به‌کارت ← تنظیمات» ویرایش می‌شوند؛ متن‌های ثابت فرم از همین ویرایشگر قابل تغییرند.</p>
            <div className="editor-shortcuts"><span>ذخیره متن در مک <kbd>⌘ + Enter</kbd></span><span>ذخیره متن در ویندوز <kbd>Ctrl + Enter</kbd></span><span>بستن ویرایشگر متن <kbd>Esc</kbd></span></div>
            <p>متن‌ها با ذخیره در ویرایشگر منتشر می‌شوند. تم و رنگ‌ها تا زدن «ذخیره رنگ‌ها» فقط پیش‌نمایش هستند؛ «لغو تغییرات» رنگ‌های ذخیره‌شده را برمی‌گرداند.</p>
            <p>در «صفحه‌ها و ویجت‌ها» صفحه را انتخاب کنید و «افزودن ویجت» را بزنید. ویجت‌ها را با دستگیره یا فلش‌ها جابه‌جا کنید. کلید نمایش ویجت را پنهان می‌کند؛ سطل زباله آن را از همین صفحه حذف می‌کند. خرید، گفت‌وگو و فرم ثبت تیکت قفل هستند.</p>
            <p>عنوان H1 تا H6 و پاراگراف را به تعداد دلخواه (تا سقف ۲۴ ویجت در صفحه) اضافه یا تکثیر کنید. روی متن ویجت در پیش‌نمایش کلیک کنید تا تنظیماتش باز شود. هر نمونه متن، تم، رنگ، اندازه، فاصله و کادر مستقل دارد. فیلد خالی یعنی پیش‌فرض تم؛ تنظیمات دستی بر تم اولویت دارند. CSS با selector برابر .widget فقط همان ویجت را تغییر می‌دهد. CSS نامعتبر تا اصلاح ذخیره نمی‌شود.</p>
            <p>تغییرات ویجت‌ها زنده دیده می‌شوند، اما فقط با «ذخیره» صفحه منتشر می‌شوند. تکثیر، نسخه مستقل می‌سازد؛ حذف و بازنشانی تا ذخیره قابل لغو هستند. ویجت‌های متنی از همین پنل و متن‌های آماده از «همه متن‌ها» مدیریت می‌شوند.</p>
            <p>ویجت «تصویر» فایل PNG یا JPEG تا ۵ مگابایت می‌پذیرد. عرض، ارتفاع موبایل، برش، فاصله، کادر و گردی هر گوشه قابل تنظیم است. روی تصویر پیش‌نمایش کلیک کنید تا تنظیماتش باز شود. تصویر بدون فایل فقط در ویرایشگر دیده می‌شود؛ حذف یا تغییر تصویر، فایل قبلی را از فضای ذخیره‌سازی پاک نمی‌کند.</p>
            <p>برای ساخت ویجت سراسری، «ذخیره سراسری» یک ویجت را بزنید یا چند ویجت را با تیک انتخاب و به یک گروه تبدیل کنید. گروه در جای اولین مورد انتخاب‌شده قرار می‌گیرد و ترتیب داخلی حفظ می‌شود. نام بدهید و انتشار را تأیید کنید؛ سپس صفحه را ذخیره کنید. از «افزودن ویجت ← سراسری‌های من» آن را در صفحه‌های دیگر قرار دهید. ویرایش سراسری همه استفاده‌ها را به‌روز می‌کند؛ «تبدیل به نسخه مستقل» فقط پیوند همین جایگاه را قطع می‌کند. ترکیب گروه‌های موجود، یک گروه تازه و مستقل از تعریف قبلی می‌سازد.</p>
            <p>«بازگشت این صفحه به ساختار پیش‌فرض» تغییرات ساختار همان صفحه را بازمی‌گرداند و تا ذخیره منتشر نمی‌شود. تغییرات صفحه‌های دیگر با جابه‌جایی بین صفحه‌ها حفظ می‌شوند.</p>
            <p>در «سربرگ» ظاهر و چیدمان را جداگانه انتخاب کنید؛ آیکون‌ها را خاموش یا روشن کنید و ترتیب ابزارها را تغییر دهید. دکمه بازگشت در صفحه جزئیات همیشه باقی می‌ماند. سربرگ جدا از چیدمان صفحه ذخیره می‌شود.</p>
            <p>ویجت «جست‌وجوی محصولات» شش طرح دارد و به هر صفحه قابل افزودن است. نتیجه‌ها در منو باز می‌شوند و کلیک روی محصول صفحه جزئیاتش را باز می‌کند. خاموش‌کردن آیکون جست‌وجوی سربرگ تأثیری بر این ویجت ندارد.</p>
          </div>
        </details>
      </aside>

      <section className="editor-preview-stage" aria-label="پیش‌نمایش مینی‌اپ">
        <div className="editor-stage-heading"><span><Smartphone size={17} /> پیش‌نمایش زنده</span><div className="editor-preview-actions">
          <button type="button" aria-label="تازه‌سازی پیش‌نمایش" title="تازه‌سازی پیش‌نمایش" onClick={onReload}><RefreshCw size={15} /></button>
          <button type="button" aria-label="پیش‌نمایش در پنجره جدا" title="پیش‌نمایش در پنجره جدا" onClick={onOpen}><ExternalLink size={15} /></button>
        </div></div>
        <div className="editor-preview-scenario">
          <label htmlFor="editor-preview-state"><ListFilter size={14} /> حالت صفحه<span>فقط پیش‌نمایش</span></label>
          <Select id="editor-preview-state" aria-label="حالت صفحه" value={page?.scenario || ''} disabled={!connected || !page} onChange={event => onScenario(event.target.value)} options={page?.scenarios || [{ value: '', label: 'در حال دریافت…' }]} />
        </div>
        {!connected && <p className={`editor-connection-note ${connectionSlow ? 'is-slow' : ''}`} role="status">{connectionSlow ? 'پیش‌نمایش آماده نشد؛ اتصال را بررسی کنید یا تازه‌سازی را بزنید.' : 'در حال آماده‌سازی پیش‌نمایش…'}</p>}
        <div className="editor-phone-frame">{children}</div>
        <div className="editor-preview-footer"><p className="editor-preview-hint">روی متن خط‌چین‌دار کلیک کنید.</p><Button variant="secondary" size="sm" disabled={!connected} icon={<Type size={14} />} onClick={onCatalog}>همه متن‌ها</Button></div>
      </section>
    </div>
  </div>;
}
