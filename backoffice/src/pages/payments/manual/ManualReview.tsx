import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, FileCheck2, Inbox, RefreshCw, Search, AlertCircle, ReceiptText } from 'lucide-react';
import { apiClient } from '@/api/client';
import { Badge, Button } from '@/components/ui';
import { formatDateTime } from '@/utils/format';
import { ManualReviewDialog } from './ManualReviewDialog';
import { ManualStatusBadge } from './ManualStatusBadge';
import { type ManualPayment, purposeLabels, statusLabels, toman } from './types';

export function ManualReview() {
  const [rows, setRows] = useState<ManualPayment[]>([]), [status, setStatus] = useState('submitted'), [page, setPage] = useState(1), [version, setVersion] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState(false), [selected, setSelected] = useState<ManualPayment | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false); setRows([]);
    apiClient.get<ManualPayment[]>(`/payment/manual/reviews?status=${status}&page=${page}&per_page=20`, { signal: controller.signal }).then(r => { if (!controller.signal.aborted) setRows(r.data); }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status, version]);
  const visible = rows.filter(row => [row.user_name, row.username, row.title, row.id, row.transaction_id, row.coupon_code].some(value => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  return <section className="surface-card manual-review-list">
    <header className="manual-section-title"><h2><Inbox size={20} />واریزهای مشتریان</h2><Button variant="secondary" size="sm" icon={<RefreshCw size={15} />} disabled={loading} onClick={() => setVersion(v => v + 1)}>تازه‌سازی</Button></header>
    <div className="manual-review-toolbar">
      <div className="manual-status-filters" role="group" aria-label="وضعیت واریز">{[['submitted','نیازمند بررسی'],['awaiting_proof','منتظر رسید'],['approved','تأییدشده'],['rejected','ردشده'],['cancelled','لغوشده'],['','همه']].map(([key,label]) => <button type="button" key={key} aria-pressed={status === key} onClick={() => { setStatus(key); setPage(1); setSearch(''); }}>{label}</button>)}</div>
      <label className="manual-list-search"><Search size={17} /><input aria-label="جستجو در نتایج دریافتی" placeholder="نام، خرید یا شماره پیگیری…" value={search} onChange={e => setSearch(e.target.value)} /><span className="sr-only">جستجو در نتایج دریافتی</span></label>
    </div>
    {search && <p className="manual-hint">جستجو در نتایج دریافتی · {visible.length.toLocaleString('fa-IR')} مورد</p>}
    {loading ? <div className="manual-list-skeleton" role="status" aria-label="در حال دریافت واریزها">{[0,1,2].map(i => <div key={i} />)}</div> :
      error ? <div className="manual-empty" role="alert"><AlertCircle size={30} /><strong>دریافت واریزها ناموفق بود</strong><Button variant="secondary" onClick={() => setVersion(v => v + 1)}>تلاش دوباره</Button></div> :
      visible.length === 0 ? <div className="manual-empty"><FileCheck2 size={36} /><strong>{search ? 'نتیجه‌ای پیدا نشد' : status === 'submitted' ? 'واریزی در انتظار بررسی نیست' : 'واریزی با این وضعیت وجود ندارد'}</strong><p>{search ? 'عبارت دیگری امتحان کنید یا جستجو را پاک کنید.' : 'پس از ارسال رسید مشتری، درخواست برای بررسی در این بخش قرار می‌گیرد.'}</p>{search && <Button variant="secondary" onClick={() => setSearch('')}>پاک کردن جستجو</Button>}</div> :
      <div className="manual-review-rows">{visible.map(row => <button type="button" className="manual-review-row" key={row.id} aria-label={`جزئیات واریز ${row.user_name || row.username || 'کاربر'} بابت ${row.title}، ${toman(row.toman)}، ${statusLabels[row.status]}`} onClick={() => setSelected(row)}>
        <span className="manual-row-avatar">{(row.user_name || row.username || 'ک').trim().slice(0,1)}</span>
        <span className="manual-row-customer"><strong>{row.user_name || row.username || 'کاربر'}</strong><span>{row.title}</span><small>{purposeLabels[row.purpose]} · {formatDateTime(row.created_at)}</small></span>
        <span className="manual-row-proof"><ReceiptText size={15} />{row.has_receipt ? 'تصویر رسید' : row.transaction_id ? 'شماره پیگیری' : 'بدون مدرک'}{row.is_test && <Badge variant="purple">آزمایشی</Badge>}</span>
        <span className="manual-row-amount"><b>{toman(row.toman)}</b><ManualStatusBadge status={row.status} /></span><ArrowLeft size={17} className="manual-row-arrow" />
      </button>)}</div>}
    {!error && <footer className="manual-pagination"><Button variant="secondary" size="sm" icon={<ChevronRight size={16} />} disabled={page === 1 || loading} onClick={() => {setPage(p => p - 1);setSearch('');}}>قبلی</Button><span>صفحه {page.toLocaleString('fa-IR')}</span><Button variant="secondary" size="sm" icon={<ChevronLeft size={16} />} disabled={rows.length < 20 || loading} onClick={() => {setPage(p => p + 1);setSearch('');}}>بعدی</Button></footer>}
    {selected && <ManualReviewDialog key={selected.id} initial={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); setVersion(v => v + 1); }} />}
  </section>;
}
