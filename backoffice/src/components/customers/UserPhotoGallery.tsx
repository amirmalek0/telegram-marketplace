import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, RefreshCw } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { userPhotosApi, type PhotoGallery, type UserPhoto } from '@/api/userPhotos';
import { customerName, type Customer } from './CustomerIdentity';
import { useCustomerPhoto } from './useCustomerPhoto';
import { formatDate } from '@/utils/format';
import './user-photo-gallery.css';

function PhotoImage({ photo, thumbnail = false }: { photo: UserPhoto; thumbnail?: boolean }) {
  const { src, loading, error } = useCustomerPhoto(photo.url);
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={thumbnail ? '' : 'تصویر پروفایل کاربر'} onError={() => setFailed(true)} draggable={false} /> : <span className={`user-photo-placeholder ${loading ? 'is-loading' : ''}`} role={thumbnail ? undefined : 'status'}><Images size={thumbnail ? 18 : 40} />{!thumbnail && <small>{error || failed ? 'تصویر دریافت نشد' : 'در حال دریافت تصویر…'}</small>}</span>;
}

export function UserPhotoGallery({ user, onClose, onSynced }: { user: Customer & { id: string }; onClose: () => void; onSynced?: () => void }) {
  const [gallery, setGallery] = useState<PhotoGallery>();
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const touch = useRef<{ x: number; y: number }>();
  const onSyncedRef = useRef(onSynced); onSyncedRef.current = onSynced;
  const pending = gallery?.sync.status === 'pending' || gallery?.sync.status === 'syncing';
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const data = await userPhotosApi.list(user.id, 0, controller.signal);
        if (controller.signal.aborted) return;
        setGallery(previous => ({ ...data, photos: [...data.photos, ...(previous?.photos || []).filter(p => !data.photos.some(n => n.id === p.id))] }));
        setError(false);
        if (data.sync.status === 'pending' || data.sync.status === 'syncing') timer = setTimeout(load, 3000);
        else onSyncedRef.current?.();
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [user.id, revision]);
  const photos = gallery?.photos || [];
  const current = photos[index];
  const more = photos.length < (gallery?.total || 0);
  const loadMore = useCallback(async (advance = false) => {
    if (moreLoading || !more) return;
    setMoreLoading(true);
    try { const data = await userPhotosApi.list(user.id, photos.length); setGallery(previous => previous ? { ...data, photos: [...previous.photos, ...data.photos.filter(p => !previous.photos.some(n => n.id === p.id))] } : data); if (advance && data.photos.length) setIndex(photos.length); setError(false); }
    catch { setError(true); } finally { setMoreLoading(false); }
  }, [user.id, photos.length, more, moreLoading]);
  const next = useCallback(() => { if (index < photos.length - 1) setIndex(value => value + 1); else if (more) void loadMore(true); }, [index, photos.length, more, loadMore]);
  const previous = useCallback(() => setIndex(value => Math.max(0, value - 1)), []);
  useEffect(() => { const key = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') { event.preventDefault(); next(); } if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); } }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [next, previous]);
  const refresh = async () => { setSyncing(true); try { await userPhotosApi.sync(user.id); setRevision(value => value + 1); setError(false); } catch { setError(true); } finally { setSyncing(false); } };
  return <Modal isOpen onClose={onClose} title={`تصاویر ${customerName(user)}`} icon={<Images size={20} />} size="xl" className="user-photo-gallery">
    <div className="user-photo-stage" dir="ltr" onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={event => { const start = touch.current; touch.current = undefined; if (!start) return; const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else previous(); } }}>
      {current ? <PhotoImage key={current.id} photo={current} /> : <div className="user-photo-empty" role="status"><Images size={44} /><strong>{loading ? 'در حال دریافت تصاویر…' : pending ? 'در حال ذخیره تصاویر از تلگرام…' : 'تصویری در آرشیو نیست'}</strong><p dir="rtl">فقط تصاویری که تلگرام در اختیار ربات می‌گذارد ذخیره می‌شوند.</p></div>}
      {photos.length > 0 && <><button type="button" className="user-photo-arrow is-previous" onClick={previous} disabled={index === 0} aria-label="تصویر قبلی"><ChevronLeft /></button><button type="button" className="user-photo-arrow is-next" onClick={next} disabled={moreLoading || (index >= photos.length - 1 && !more)} aria-label="تصویر بعدی"><ChevronRight /></button><span className="user-photo-counter" aria-live="polite">{(index + 1).toLocaleString('fa-IR')} / {(gallery?.total || photos.length).toLocaleString('fa-IR')}</span></>}
    </div>
    {current && <div className="user-photo-caption"><span>{current.current ? 'تصویر فعلی' : 'تصویر ذخیره‌شده'}</span><small>ذخیره در {formatDate(current.saved_at)}</small></div>}
    {photos.length > 1 && <div className="user-photo-thumbnails" dir="ltr">{photos.slice(Math.max(0, index - 3), index + 4).map(p => <button type="button" key={p.id} aria-label={`نمایش تصویر ${(photos.indexOf(p) + 1).toLocaleString('fa-IR')}`} aria-pressed={p.id === current?.id} onClick={() => setIndex(photos.indexOf(p))}><PhotoImage photo={p} thumbnail /></button>)}</div>}
    {error && <div className="user-photo-notice" role="alert">دریافت تصاویر ناموفق بود.<button type="button" onClick={() => setRevision(value => value + 1)}>تلاش دوباره</button></div>}
    <div className="user-photo-toolbar"><span role="status">{pending ? 'در حال همگام‌سازی با تلگرام…' : gallery?.sync.status === 'error' ? gallery.sync.error : 'آرشیو خصوصی تصاویر پروفایل'}</span><Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={refresh} loading={syncing} disabled={pending}>همگام‌سازی</Button>{more && <Button variant="ghost" size="sm" onClick={() => void loadMore()} loading={moreLoading}>تصاویر بیشتر</Button>}</div>
  </Modal>;
}
