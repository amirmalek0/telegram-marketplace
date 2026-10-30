import { useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { apiClient } from '@/api/client';
import { IconPreview } from './IconPicker';
import type { NavigationIcon } from './navigationSettings';

export function HeaderLogoEditor({ logo, fallbackIcon, disabled, uploading, onUploading, onChange }: {
  logo?: string; fallbackIcon?: NavigationIcon; disabled: boolean; uploading: boolean; onUploading: (busy: boolean) => void; onChange: (logo: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<string>();
  const upload = async (file?: File) => {
    if (!file || uploading || disabled) return;
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('تصویر PNG یا JPEG با حجم حداکثر ۲ مگابایت انتخاب کنید.'); return;
    }
    onUploading(true);
    try {
      const body = new FormData(); body.append('logo', file);
      const { data } = await apiClient.post<{ url: string }>('/miniapp-logo', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.url);
    } catch { setError('بارگذاری ناموفق بود. تصویر باید معتبر و حداکثر ۲۰۴۸×۲۰۴۸ پیکسل باشد؛ دوباره تلاش کنید.'); }
    finally { onUploading(false); }
  };
  return <section className="header-logo-editor" aria-label="لوگوی فروشگاه">
    <div className="header-logo-heading"><ImagePlus size={17} /><h3>لوگوی فروشگاه</h3><small>{logo ? 'تصویر اختصاصی' : fallbackIcon ? 'آیکون انتخابی' : 'آیکون پیش‌فرض'}</small></div>
    <div className="header-logo-body">
      <span className="header-logo-preview">{logo && failed !== logo ? <img src={logo} alt="پیش‌نمایش لوگوی فروشگاه" onError={() => setFailed(logo)} /> : <IconPreview name={fallbackIcon ?? 'shop'} size={28} />}</span>
      <div><p>به‌جای آیکون کنار عنوان، لوگوی خودتان را نمایش دهید.</p><small>PNG / JPEG · حداکثر ۲ مگابایت · پیشنهاد: تصویر مربعی</small>
        <div className="header-logo-actions">
          <button type="button" disabled={disabled || uploading} onClick={() => input.current?.click()}><Upload size={14} />{uploading ? 'در حال بارگذاری…' : logo ? 'تغییر لوگو' : 'بارگذاری لوگو'}</button>
          {logo && <button type="button" disabled={disabled || uploading} onClick={() => { onChange(''); setError(''); }}>استفاده از آیکون</button>}
        </div>
      </div>
    </div>
    <input ref={input} type="file" accept="image/png,image/jpeg" aria-label="انتخاب فایل لوگوی فروشگاه" hidden onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    {uploading && <p className="header-logo-notice" role="status">در حال بارگذاری؛ سپس پیش‌نمایش به‌روز می‌شود.</p>}
    {error && <p className="widget-error" role="alert">{error}</p>}
  </section>;
}
