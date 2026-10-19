import type { ReactNode } from 'react';
import { BookOpen, ChevronDown, ExternalLink, ListFilter, RefreshCw, Smartphone, Type } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import './editor-workspace.css';

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
    <header className="editor-command-bar">
      <label className="editor-scenario-control"><span><ListFilter size={16} /> حالت صفحه</span>
        <Select aria-label="حالت صفحه" value={page?.scenario || ''} disabled={!connected || !page} onChange={event => onScenario(event.target.value)} options={page?.scenarios || [{ value: '', label: 'در حال دریافت…' }]} />
      </label>
      <Button variant="secondary" size="sm" disabled={!connected} icon={<Type size={16} />} onClick={onCatalog}>همه متن‌ها</Button>
      <div className="editor-command-actions">
        <Button variant="secondary" size="sm" icon={<RefreshCw size={15} />} onClick={onReload}>تازه‌سازی</Button>
        <Button variant="secondary" size="sm" icon={<ExternalLink size={15} />} onClick={onOpen}>پنجره جدا</Button>
      </div>
    </header>

    <div className="editor-studio-grid">
      <aside className="editor-inspector" aria-label="تنظیمات ظاهر مینی‌اپ">
        {controls}
        <details className="editor-help">
          <summary><BookOpen size={16} /><span>راهنما و میانبرها</span><ChevronDown size={16} /></summary>
          <div className="editor-help-body">
            <p>با لینک‌ها و نوار پایین پیش‌نمایش بین صفحه‌ها جابه‌جا شوید. از «حالت صفحه» محتوا، حالت خالی، خطا و سایر وضعیت‌ها را ببینید.</p>
            <p>برای ویرایش، روی متن خط‌چین‌دار کلیک کنید. متن لینک و دکمه با <kbd>⌥ + کلیک</kbd> در مک و <kbd>Alt + کلیک</kbd> در ویندوز ویرایش می‌شود. «همه متن‌ها» برای جست‌وجوی متن‌های پنهان است.</p>
            <div className="editor-shortcuts"><span>ذخیره متن در مک <kbd>⌘ + Enter</kbd></span><span>ذخیره متن در ویندوز <kbd>Ctrl + Enter</kbd></span><span>بستن ویرایشگر متن <kbd>Esc</kbd></span></div>
            <p>متن‌ها با ذخیره در ویرایشگر منتشر می‌شوند. تم و رنگ‌ها تا زدن «ذخیره رنگ‌ها» فقط پیش‌نمایش هستند؛ «لغو تغییرات» رنگ‌های ذخیره‌شده را برمی‌گرداند.</p>
            <p>در «صفحه‌ها و بخش‌ها» صفحه را انتخاب کنید، از کتابخانه بخش اضافه کنید و با دستگیره یا فلش‌ها جابه‌جا کنید. کلید نمایش، بخش را پنهان می‌کند؛ سطل زباله فقط آن را از این صفحه برمی‌دارد. هر بخش طرح مستقل دارد و صفحه‌ها جدا ذخیره می‌شوند. خرید، گفت‌وگو و فرم ثبت تیکت قفل هستند و فقط در صفحه خود استفاده می‌شوند.</p>
            <p>«بازگشت این صفحه به ساختار پیش‌فرض» تغییرات ساختار همان صفحه را بازمی‌گرداند و تا ذخیره منتشر نمی‌شود. تغییرات صفحه‌های دیگر با جابه‌جایی بین صفحه‌ها حفظ می‌شوند.</p>
          </div>
        </details>
      </aside>

      <section className="editor-preview-stage" aria-label="پیش‌نمایش مینی‌اپ">
        <div className="editor-stage-heading"><span><Smartphone size={17} /> پیش‌نمایش زنده</span><span className="editor-stage-note">نمای موبایل</span></div>
        {!connected && <p className={`editor-connection-note ${connectionSlow ? 'is-slow' : ''}`} role="status">{connectionSlow ? 'پیش‌نمایش آماده نشد؛ اتصال را بررسی کنید یا تازه‌سازی را بزنید.' : 'در حال آماده‌سازی پیش‌نمایش…'}</p>}
        <div className="editor-phone-frame">{children}</div>
        <p className="editor-preview-hint"><Type size={14} /> برای ویرایش، روی متن خط‌چین‌دار کلیک کنید.</p>
      </section>
    </div>
  </div>;
}
