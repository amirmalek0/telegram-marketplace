import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
import { walletsApi } from '@/api';
import type { AdminWalletDetailResponse, AdminWalletResponse } from '@/types';
import { Button } from '@/components/ui';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CustomerIdentity } from '@/components/customers/CustomerIdentity';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { CopyIdentifier } from '@/components/ui/CopyIdentifier';
import { formatDate } from '@/utils/format';

export function WalletHistoryModal({ wallet, onClose }: { wallet: AdminWalletResponse | null; onClose: () => void }) {
  const [detail, setDetail] = useState<AdminWalletDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!wallet) return;
    const controller = new AbortController();
    setDetail(null); setLoading(true); setError(false);
    walletsApi.get(wallet.user_id, controller.signal).then(result => { if (!controller.signal.aborted) setDetail(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [wallet, revision]);
  return <CatalogModal isOpen={Boolean(wallet)} onClose={onClose} title="تاریخچه کیف پول" size="xl" icon={<History size={18} />}>
    {loading ? <p className="customer-inline-error" role="status">در حال دریافت گردش‌ها…</p> : error ? <div className="customer-inline-error" role="alert"><p>دریافت گردش‌ها ناموفق بود</p><Button variant="secondary" onClick={() => setRevision(value => value + 1)}>تلاش دوباره</Button></div> : detail && <div className="customer-history">
      <div className="customer-profile-hero"><CustomerIdentity user={detail.wallet} to={`/users?user=${detail.wallet.user_id}`} /><div className="finance-stack"><span className="finance-muted">موجودی فعلی</span><span className="finance-amount"><StarsAmount value={detail.wallet.balance} /></span></div></div>
      {detail.wallet.transaction_count > detail.transactions.length && <p className="finance-muted">نمایش {detail.transactions.length.toLocaleString('fa-IR')} گردش اخیر از {detail.wallet.transaction_count.toLocaleString('fa-IR')} تراکنش</p>}
      {detail.transactions.length === 0 ? <p className="customer-inline-error">تراکنشی ثبت نشده است</p> : detail.transactions.map(item => {
        const credit = item.balance_after >= item.balance_before;
        return <article className={`customer-history-entry ${credit ? '' : 'customer-history-entry--debit'}`} key={item.id}>
          <span className="customer-history-icon">{credit ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
          <div><b>{item.description || 'تراکنش کیف پول'}</b><div className="customer-history-meta"><span>{formatDate(item.created_at)}</span><span>قبل: {item.balance_before.toLocaleString('fa-IR')} · بعد: {item.balance_after.toLocaleString('fa-IR')}</span></div><div className="mt-2"><CopyIdentifier value={item.id} label="شناسه گردش" /></div></div>
          <strong className="customer-history-amount" aria-label={credit ? 'افزایش موجودی' : 'کاهش موجودی'}><span dir="ltr">{credit ? '+' : '−'}</span><StarsAmount value={Math.abs(item.amount)} /></strong>
        </article>;
      })}
    </div>}
  </CatalogModal>;
}
