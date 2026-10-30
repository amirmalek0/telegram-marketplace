import { useId, useState, type ReactNode } from 'react';
import { Code2, FileText, Paintbrush, RotateCcw, Check, AlertCircle } from 'lucide-react';
import './widget-customize.css';

export function WidgetCustomizePanel({ content, design, css, cssError, disabled, count, onCssChange, onReset, image = false }: {
  content?: ReactNode; design: ReactNode; css: string; cssError: string | null; disabled: boolean; count: number;
  onCssChange: (value: string) => void; onReset: () => void; image?: boolean;
}) {
  const id = useId();
  const [active, setActive] = useState(content ? 'content' : 'design');
  const [reset, setReset] = useState(false);
  const tabs = [...(content ? [{ id: 'content', label: 'محتوا', Icon: FileText }] : []), { id: 'design', label: 'طراحی', Icon: Paintbrush }, { id: 'css', label: 'پیشرفته', Icon: Code2 }];
  const configured = count > 0 || !!css;
  return <fieldset className="text-widget-editor widget-customize" disabled={disabled}>
    <div className="widget-customize-heading"><strong>شخصی‌سازی ویجت</strong><span>{configured ? `${(count + (css ? 1 : 0)).toLocaleString('fa-IR')} تنظیم سفارشی` : 'ظاهر پیش‌فرض تم'}</span></div>
    <div className="widget-customize-tabs" role="tablist" aria-label="بخش‌های شخصی‌سازی ویجت" dir="rtl">
      {tabs.map(({ id: key, label, Icon }, index) => <button key={key} type="button" role="tab" id={id + key} aria-selected={active === key} aria-controls={id + '-panel'} tabIndex={active === key ? 0 : -1} onClick={() => setActive(key)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length;
        setActive(tabs[next].id); document.getElementById(id + tabs[next].id)?.focus();
      }}><Icon size={16} />{label}{key === 'css' && cssError && <span className="widget-tab-error" aria-label="CSS نامعتبر" />}</button>)}
    </div>
    {cssError && active !== 'css' && <button type="button" className="widget-css-warning" onClick={() => setActive('css')}><AlertCircle size={15} /> CSS نامعتبر است؛ برای اصلاح باز کنید.</button>}
    <div className="widget-customize-body" id={id + '-panel'} role="tabpanel" aria-labelledby={id + active} tabIndex={0}>
      {active === 'content' && <div className="widget-content-fields">{content}</div>}
      {active === 'design' && <><p className="widget-help widget-design-hint">فیلد خالی از تم پیروی می‌کند. تغییرات را در پیش‌نمایش زنده ببینید.</p>{design}</>}
      {active === 'css' && <div className="widget-code-panel"><div className="widget-code-heading"><code>.widget {image ? ' / .widget img' : ''}</code><span>CSS محلی</span></div>
        <p className="widget-help">تنها همین ویجت تغییر می‌کند. CSS بعد از تنظیمات طراحی اعمال می‌شود. آدرس خارجی و import مجاز نیست.</p>
        <textarea className="widget-css-input" dir="ltr" aria-label={image ? 'CSS اختصاصی تصویر' : 'CSS اختصاصی'} aria-invalid={!!cssError} aria-describedby={cssError ? id + '-error' : undefined} spellCheck={false} rows={9} maxLength={4000} placeholder={'.widget {\n  border-radius: 16px;\n}'} value={css} onChange={event => onCssChange(event.target.value)} />
        <div className="widget-code-status"><span>{css.length.toLocaleString('fa-IR')} / ۴۰۰۰</span>{!cssError && <span><Check size={13} />{css ? 'بررسی امنیتی انجام شد' : 'اختیاری'}</span>}</div>
        {cssError && <p id={id + '-error'} className="widget-error" role="alert">{cssError} تا اصلاح آن، ذخیره ممکن نیست.</p>}
      </div>}
    </div>
    <div className="widget-customize-footer">{reset ? <div className="widget-reset-confirm" role="group" aria-label="تأیید بازنشانی ظاهر"><span>ظاهر و CSS بازنشانی شوند؟ محتوا حفظ می‌شود.</span><button type="button" onClick={() => { onReset(); setReset(false); }}>بله، بازنشانی</button><button type="button" onClick={() => setReset(false)}>انصراف</button></div> : <><span>محتوا با تغییر ظاهر پاک نمی‌شود.</span><button type="button" disabled={disabled || !configured} onClick={() => setReset(true)}><RotateCcw size={14} /> بازنشانی ظاهر</button></>}</div>
  </fieldset>;
}
