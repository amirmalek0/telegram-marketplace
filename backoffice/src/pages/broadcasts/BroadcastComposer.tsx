import { Bell, Info, Send, Type } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';

export function BroadcastComposer({ open, busy, title, message, onTitle, onMessage, onClose, onReview }: {
  open: boolean; busy: boolean; title: string; message: string;
  onTitle: (value: string) => void; onMessage: (value: string) => void; onClose: () => void; onReview: () => void;
}) {
  return <Modal isOpen={open} onClose={onClose} title="اعلان جدید" icon={<Bell size={19} />} size="xl" footer={<>
    <Button variant="secondary" disabled={busy} onClick={onClose}>بستن پیش‌نویس</Button>
    <Button type="submit" form="broadcast-composer" icon={<Send size={16} />} disabled={busy || !title.trim() || !message.trim()}>بررسی و انتشار</Button>
  </>}>
    <form id="broadcast-composer" onSubmit={event => { event.preventDefault(); if (title.trim() && message.trim()) onReview(); }}>
      <div className="system-note mb-5"><Info size={17} /><p>اعلان برای همه کاربران در مینی‌اپ نمایش داده می‌شود؛ پیام خصوصی تلگرام ارسال نمی‌شود.</p></div>
      <div className="broadcast-composer">
        <fieldset disabled={busy}><CatalogFormSection title="محتوای اعلان" icon={Type}>
          <Input label="عنوان اعلان" placeholder="عنوان کوتاه و روشن…" value={title} onChange={event => onTitle(event.target.value)} maxLength={120} required />
          <Textarea label="متن اعلان" placeholder="پیام خود را برای کاربران بنویسید…" value={message} onChange={event => onMessage(event.target.value)} maxLength={4000} rows={7} required />
          <p className="text-xs text-[rgb(var(--color-text-muted))]">{message.length.toLocaleString('fa-IR')} از ۴۰۰۰ نویسه</p>
        </CatalogFormSection></fieldset>
        <aside className="broadcast-preview" aria-label="پیش‌نمایش اعلان">
          <span className="flex items-center gap-2 text-xs text-[rgb(var(--color-text-secondary))]"><Bell size={16} /> پیش‌نمایش در مینی‌اپ</span>
          <h3>{title.trim() || 'عنوان اعلان شما'}</h3><p>{message.trim() || 'متن پیام اینجا نمایش داده می‌شود.'}</p>
        </aside>
      </div>
    </form>
  </Modal>;
}
