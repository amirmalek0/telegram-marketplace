import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Check, CreditCard, ExternalLink, FileImage, ReceiptText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button, Modal } from '@/components/ui';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { formatDateTime } from '@/utils/format';
import { BankLogo } from './BankLogo';
import { ManualStatusBadge } from './ManualStatusBadge';
import { type ManualPayment, purposeLabels, toman } from './types';

export function ManualReviewDialog({ initial, onClose, onDone }: { initial: ManualPayment; onClose: () => void; onDone: () => void }) {
  const [row, setRow] = useState(initial), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(false), [version, setVersion] = useState(0);
  const [receipt, setReceipt] = useState(''), [receiptError, setReceiptError] = useState(false), [receiptVersion, setReceiptVersion] = useState(0);
  const [note, setNote] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    apiClient.get<ManualPayment>(`/payment/manual/reviews/${initial.id}`, { signal: controller.signal }).then(r => { if (!controller.signal.aborted) setRow(r.data); }).catch(() => { if (!controller.signal.aborted) setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [initial.id, version]);
  useEffect(() => {
    if (!row.has_receipt) return;
    let active = true, url = '';
    setReceipt(''); setReceiptError(false);
    apiClient.get(`/payment/manual/reviews/${row.id}/receipt`, { responseType: 'blob' }).then(r => { if (active) { url = URL.createObjectURL(r.data); setReceipt(url); } }).catch(() => { if (active) setReceiptError(true); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [row.id, row.has_receipt, receiptVersion]);
  const review = async (decision: 'approve' | 'reject') => {
    if (busy || loading || loadError || row.status !== 'submitted' || decision === 'approve' && !confirmed) return;
    if (decision === 'reject' && !note.trim()) return toast.error('دلیل رد پرداخت را بنویسید');
    setBusy(true);
    try { await apiClient.post(`/payment/manual/reviews/${row.id}`, { decision, note, confirmed: true }); toast.success(decision === 'approve' ? 'پرداخت تأیید شد' : 'پرداخت رد شد'); onDone(); }
    catch (e: any) { toast.error(e.response?.data?.error || 'ثبت بررسی ناموفق بود'); if (e.response?.status === 409) { setConfirmed(false); setVersion(v => v + 1); } }
    finally { setBusy(false); }
  };
  const card = row.cards.find(c => c.id === row.destination_card_id);
  const canReview = !loading && !loadError && row.status === 'submitted';
  return <Modal isOpen onClose={() => !busy && onClose()} title="جزئیات واریز" icon={<ReceiptText size={20} />} size="xl" className="manual-review-modal"
    footer={canReview ? <div className="manual-review-actions"><Button icon={<Check size={17} />} disabled={busy || !confirmed} loading={busy} onClick={() => void review('approve')}>تأیید و آزادسازی خرید</Button><Button variant="danger" icon={<X size={17} />} disabled={busy || !note.trim()} onClick={() => void review('reject')}>رد پرداخت</Button></div> : <Button variant="secondary" onClick={onClose}>بستن</Button>}>
    <div className="manual-review-body">
      {loading ? <div className="manual-empty" role="status">در حال دریافت آخرین وضعیت…</div> : loadError ? <div className="manual-empty" role="alert"><AlertCircle /><strong>دریافت جزئیات ناموفق بود</strong><Button onClick={() => setVersion(v => v + 1)}>تلاش دوباره</Button></div> : <>
        <div className="manual-review-amount"><div><span>مبلغ نهایی واریز</span><strong>{toman(row.toman)}</strong></div><div><ManualStatusBadge status={row.status} /><span>{row.is_test ? 'آزمایشی — بدون تحویل واقعی' : 'پرداخت واقعی'}</span></div></div>
        <div className="manual-review-columns">
          <section className="manual-review-group"><h3><ReceiptText size={17} />اطلاعات خرید</h3><dl>
            <dt>مشتری</dt><dd><Link to={`/users/${row.user_id}/tickets`}>{row.user_name || row.username || 'کاربر'}<ExternalLink size={12} /></Link>{row.username && <small dir="ltr">@{row.username}</small>}</dd>
            <dt>بابت</dt><dd><strong>{row.title}</strong><small>{purposeLabels[row.purpose]}</small></dd>
            <dt>تاریخ ثبت</dt><dd>{formatDateTime(row.created_at)}</dd>
            {row.submitted_at && <><dt>ارسال رسید</dt><dd>{formatDateTime(row.submitted_at)}</dd></>}
            <dt>شناسه پرداخت</dt><dd><CopyIdentifier value={row.id} /></dd>
            {row.order_id && <><dt>شناسه سفارش</dt><dd><CopyIdentifier value={row.order_id} /></dd></>}
          </dl></section>
          <section className="manual-review-group"><h3><CreditCard size={17} />اطلاعات واریز</h3>
            {card ? <div className="manual-destination"><BankLogo bank={card.bank} /><div><strong>{card.bank.name}</strong><span>{card.owner}</span><CopyIdentifier full value={card.number} /></div></div> : <p className="manual-hint">{row.toman === 0 && row.coupon_code ? 'تسویه کامل با کد تخفیف؛ بدون واریز بانکی' : 'کارت مقصد هنوز انتخاب نشده است.'}</p>}
            <dl><dt>شماره پیگیری</dt><dd>{row.transaction_id ? <CopyIdentifier value={row.transaction_id} full /> : 'ثبت نشده'}</dd></dl>
            {row.coupon_code && <dl className="manual-discount-detail"><dt>قیمت اصلی</dt><dd>{toman(row.original_toman)}</dd><dt>کد تخفیف</dt><dd><CopyIdentifier value={row.coupon_code} /></dd><dt>تخفیف</dt><dd>{toman(row.discount_toman)}</dd></dl>}
          </section>
        </div>
        <section className="manual-review-group"><h3><FileImage size={17} />مدرک پرداخت</h3>
          {row.has_receipt ? <div className="manual-receipt">{receipt ? <a href={receipt} target="_blank" rel="noreferrer"><img src={receipt} alt="رسید واریز کاربر" /><span>مشاهده اندازه اصلی<ExternalLink size={14} /></span></a> : <div className="manual-empty" role={receiptError ? 'alert' : 'status'}>{receiptError ? <><span>دریافت تصویر ناموفق بود</span><Button size="sm" onClick={() => setReceiptVersion(v => v + 1)}>تلاش دوباره</Button></> : 'در حال دریافت تصویر…'}</div>}</div> : <p className="manual-hint">{row.transaction_id ? 'مشتری شماره پیگیری ارسال کرده است؛ تصویر رسید ندارد.' : 'تصویر رسیدی ثبت نشده است.'}</p>}
        </section>
        {(row.review_note || row.reviewed_at) && <section className="manual-review-group"><h3>نتیجه بررسی</h3><p className="manual-hint">{row.review_note}</p>{row.reviewed_at && <small>{formatDateTime(row.reviewed_at)}</small>}{row.reviewed_by && <CopyIdentifier value={row.reviewed_by} label="شناسه مدیر بررسی‌کننده" />}</section>}
        {canReview && <fieldset disabled={busy} className="manual-review-decision">
          <p className="manual-caution"><AlertCircle size={18} /><span>{row.is_test ? 'این پرداخت آزمایشی است و تأیید آن خرید یا اعتبار واقعی ایجاد نمی‌کند.' : 'رسید به‌تنهایی اثبات واریز نیست. مبلغ و شماره پیگیری را با گردش حساب بانکی تطبیق دهید.'}</span></p>
          <label htmlFor="manual-review-note">یادداشت بررسی <small>برای رد پرداخت الزامی است و برای مشتری ارسال می‌شود</small><textarea id="manual-review-note" rows={3} maxLength={1000} value={note} placeholder="نتیجه تطبیق واریز یا دلیل رد پرداخت…" onChange={e => setNote(e.target.value)} /></label>
          <label className="manual-checkbox"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{row.is_test ? 'از آزمایشی بودن این پرداخت آگاه هستم.' : 'واریز این مبلغ به حساب مقصد را بررسی و تأیید کرده‌ام.'}</label>
        </fieldset>}
      </>}
    </div>
  </Modal>;
}
