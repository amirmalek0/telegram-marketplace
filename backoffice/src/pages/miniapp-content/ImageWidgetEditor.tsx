import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { apiClient } from '@/api/client';
import { WidgetCustomizePanel } from './WidgetCustomizePanel';
import { WidgetStyleFields } from './WidgetStyleFields';
import { customCssError } from './textWidgets';
import { type ImageWidget } from './imageWidgets';
import './image-widget-editor.css';

export function ImageWidgetEditor({ value, disabled, onChange, onUploading }: {
  value: ImageWidget; disabled: boolean; onChange: (value: ImageWidget) => void; onUploading: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const latest = useRef({ value, onChange, onUploading });
  latest.current = { value, onChange, onUploading };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => () => { if (request.current) { request.current.abort(); latest.current.onUploading(false); } }, []);
  const upload = async (file?: File) => {
    if (!file || disabled || request.current) return;
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('تصویر PNG یا JPEG با حجم حداکثر ۵ مگابایت انتخاب کنید.'); return;
    }
    const controller = new AbortController(); request.current = controller;
    setBusy(true); onUploading(true);
    try {
      const body = new FormData(); body.append('image', file);
      const { data } = await apiClient.post<{ url: string }>('/miniapp-images', body, { signal: controller.signal, headers: { 'Content-Type': 'multipart/form-data' } });
      if (!controller.signal.aborted) latest.current.onChange({ ...latest.current.value, src: data.url });
    } catch {
      if (!controller.signal.aborted) setError('بارگذاری ناموفق بود. تصویر باید معتبر و حداکثر ۴۰۹۶×۴۰۹۶ پیکسل باشد؛ دوباره تلاش کنید.');
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false); latest.current.onUploading(false); }
    }
  };
  const content = <>
    <div className="image-widget-upload">
      <div className="image-widget-thumbnail">{value.src ? <img src={value.src} alt="پیش‌نمایش تصویر انتخاب‌شده" /> : <ImagePlus size={32} />}</div>
      <div><p>PNG / JPEG · حداکثر ۵ مگابایت</p><small>حداکثر ۴۰۹۶×۴۰۹۶ پیکسل؛ تصاویر عمومی هستند.</small><div className="header-logo-actions">
        <button type="button" onClick={() => input.current?.click()}><Upload size={14} />{busy ? 'در حال بارگذاری…' : value.src ? 'تغییر تصویر' : 'بارگذاری تصویر'}</button>
        {value.src && <button type="button" onClick={() => onChange({ ...value, src: '' })}>حذف تصویر</button>}
      </div></div>
    </div>
    <input ref={input} type="file" hidden accept="image/png,image/jpeg" aria-label="انتخاب فایل تصویر ویجت" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    {busy && <p className="widget-help" role="status">در حال بارگذاری؛ سپس پیش‌نمایش به‌روز می‌شود.</p>}
    {error && <p className="widget-error" role="alert">{error}</p>}
    <label className="widget-field"><span>متن جایگزین تصویر</span><input maxLength={500} aria-label="متن جایگزین تصویر" placeholder="توضیح کوتاه برای دسترس‌پذیری" value={value.alt} onChange={event => onChange({ ...value, alt: event.target.value })} /></label>
    <p className="widget-help">برای تصویر تزئینی، متن جایگزین را خالی بگذارید. اندازه و ظاهر در زبانه طراحی تنظیم می‌شوند.</p>
  </>;
  return <WidgetCustomizePanel image content={content} disabled={disabled || busy} count={Object.keys(value.styles).length} design={<WidgetStyleFields image styles={value.styles} onChange={styles => onChange({ ...value, styles })} />} css={value.css} cssError={customCssError(value.css)} onCssChange={css => onChange({ ...value, css })} onReset={() => onChange({ ...value, styles: {}, css: '' })} />;
}
