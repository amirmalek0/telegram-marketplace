import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Crown, History, Pencil, Plus, Trash2, UsersRound, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletsApi } from '@/api';
import type { AdminWalletResponse, CreateWalletTopupPackRequest, WalletTopupPackResponse } from '@/types';
import { Badge, Button, ConfirmationModal } from '@/components/ui';
import type { Column } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { FinanceSummary } from '@/components/finance/FinanceSummary';
import { CustomerIdentity, customerName } from '@/components/customers/CustomerIdentity';
import { CustomerPhone } from '@/components/customers/CustomerPhone';
import { StarsAmount } from '@/components/ui/StarsAmount';
import { CatalogPrices } from '@/components/catalog/CatalogPrices';
import { formatDate } from '@/utils/format';
import { WalletAdjustmentPanel, type WalletAdjustmentMode } from './WalletAdjustmentPanel';
import { WalletHistoryModal } from './WalletHistoryModal';
import { WalletPackModal } from './WalletPackModal';

type Tab = 'wallets' | 'packs';
const emptyPack: CreateWalletTopupPackRequest = { toman_price: 0, title: '', stars: 50, status: 'active', sort_order: 0 };

export default function WalletsPage() {
  const [tab, setTab] = useState<Tab>('wallets');
  const [wallets, setWallets] = useState<AdminWalletResponse[]>([]);
  const [packs, setPacks] = useState<WalletTopupPackResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [packPage, setPackPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState(false);
  const [packError, setPackError] = useState(false);
  const [history, setHistory] = useState<AdminWalletResponse | null>(null);
  const [adjusting, setAdjusting] = useState<AdminWalletResponse | null>(null);
  const [amount, setAmount] = useState(0);
  const [adjustmentMode, setAdjustmentMode] = useState<WalletAdjustmentMode>('credit');
  const [description, setDescription] = useState('اصلاح موجودی توسط مدیر');
  const [editingPack, setEditingPack] = useState<WalletTopupPackResponse | 'new' | null>(null);
  const [packForm, setPackForm] = useState<CreateWalletTopupPackRequest>(emptyPack);
  const [deletingPack, setDeletingPack] = useState<WalletTopupPackResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current; setLoading(true); setWalletError(false); setPackError(false);
    const [walletResult, packResult] = await Promise.allSettled([walletsApi.list({ page, per_page: 20 }), walletsApi.listPacks()]);
    if (current !== request.current) return;
    if (walletResult.status === 'fulfilled') { setWallets(walletResult.value.data); setTotal(walletResult.value.total); } else setWalletError(true);
    if (packResult.status === 'fulfilled') setPacks(packResult.value); else setPackError(true);
    setLoading(false);
  }, [page]);
  useEffect(() => { void load(); return () => { request.current++; }; }, [load]);
  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault(); if (saving || !adjusting) return;
    if (!Number.isSafeInteger(amount) || amount <= 0) return toast.error('مقدار تغییر باید عدد صحیح و مثبت باشد');
    if (adjustmentMode === 'debit' && amount > adjusting.balance) return toast.error('مقدار کاهش از موجودی فعلی بیشتر است');
    setSaving(true);
    try {
      const result = await walletsApi.adjust(adjusting.user_id, adjustmentMode === 'credit' ? amount : -amount, description);
      setWallets(items => items.map(item => item.user_id === adjusting.user_id ? result.wallet : item));
      setAdjusting(null); toast.success('موجودی کیف پول ثبت شد');
    } catch { toast.error('تغییر موجودی انجام نشد؛ موجودی نمی‌تواند منفی شود'); }
    finally { setSaving(false); }
  };
  const beginPack = (pack?: WalletTopupPackResponse) => {
    setEditingPack(pack || 'new');
    setPackForm(pack ? { toman_price: pack.toman_price ?? 0, title: pack.title, stars: pack.stars, status: pack.status, sort_order: pack.sort_order } : emptyPack);
  };
  const submitPack = async (event: FormEvent) => {
    event.preventDefault(); if (!editingPack || saving) return;
    if (!packForm.title.trim() || !Number.isSafeInteger(packForm.stars) || packForm.stars < 1 || packForm.stars > 100000 || !Number.isSafeInteger(packForm.sort_order) || packForm.sort_order < 0) return toast.error('عنوان، مقدار و ترتیب بسته را بررسی کنید');
    setSaving(true);
    try {
      const payload = { ...packForm, title: packForm.title.trim() };
      editingPack === 'new' ? await walletsApi.createPack(payload) : await walletsApi.updatePack(editingPack.id, payload);
      setEditingPack(null); toast.success('بسته شارژ ذخیره شد'); void load();
    } catch { toast.error('ذخیره بسته شارژ ناموفق بود'); } finally { setSaving(false); }
  };
  const removePack = async () => {
    if (!deletingPack || saving) return; setSaving(true);
    try { await walletsApi.deletePack(deletingPack.id); setDeletingPack(null); toast.success('بسته شارژ حذف شد'); void load(); }
    catch { toast.error('حذف بسته شارژ ناموفق بود'); } finally { setSaving(false); }
  };
  const columns: Column<AdminWalletResponse>[] = [
    { key: 'first_name', title: 'صاحب کیف پول', render: (_, row) => <CustomerIdentity user={row} to={`/users?user=${row.user_id}`} /> },
    { key: 'phone_number', title: 'شماره تلفن', render: (_, row) => <CustomerPhone value={row.phone_number} /> },
    { key: 'balance', title: 'موجودی', render: value => <span className="finance-amount"><StarsAmount value={Number(value)} /></span> },
    { key: 'has_active_plan', title: 'اشتراک', render: (_, row) => <div className="finance-stack">{row.has_active_plan ? <><Badge variant="purple"><Crown size={12} />VIP فعال</Badge>{row.plan_expire_at && <span className="finance-muted">تا {formatDate(row.plan_expire_at)}</span>}</> : <Badge>عادی</Badge>}</div> },
    { key: 'transaction_count', title: 'گردش حساب', render: value => <span className="finance-muted">{Number(value).toLocaleString('fa-IR')} تراکنش</span> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<History size={14} />} onClick={() => setHistory(row)}>گردش‌ها</Button><Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => { setAdjusting(row); setAmount(0); setAdjustmentMode('credit'); setDescription('اصلاح موجودی توسط مدیر'); }}>تنظیم موجودی</Button></div> },
  ];
  const packColumns: Column<WalletTopupPackResponse>[] = [
    { key: 'title', title: 'بسته شارژ', render: (_, row) => <button type="button" className="customer-offer-title" onClick={() => beginPack(row)}><span className="customer-offer-icon"><Coins size={21} /></span><b>{row.title}</b></button> },
    { key: 'stars', title: 'اعتبار دریافتی', render: value => <span className="finance-amount"><StarsAmount value={Number(value)} /></span> },
    { key: 'toman_price', title: 'قیمت خرید', render: (_, row) => <CatalogPrices stars={row.stars} toman={row.toman_price} /> },
    { key: 'sort_order', title: 'ترتیب نمایش', render: value => <span className="finance-muted">{Number(value).toLocaleString('fa-IR')}</span> },
    { key: 'status', title: 'وضعیت', render: value => <Badge variant={value === 'active' ? 'success' : 'default'} dot>{value === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => beginPack(row)}>ویرایش</Button><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} aria-label={`حذف بسته ${row.title}`} onClick={() => setDeletingPack(row)} /></div> },
  ];
  return <div className="customers-page">
    <CatalogHeader title="کیف پول‌ها" icon={WalletCards} total={tab === 'wallets' ? total : packs.length} loading={loading} actions={tab === 'packs' ? <Button icon={<Plus size={16} />} onClick={() => beginPack()}>بسته جدید</Button> : null} />
    <FinanceSummary label="آمار کیف پول‌ها" loading={loading} items={[
      { label: 'کیف پول کاربران', value: walletError ? undefined : total, icon: UsersRound, tone: 'blue' },
      { label: 'بسته‌های فعال', value: packError ? undefined : packs.filter(pack => pack.status === 'active').length, icon: Coins, tone: 'green' },
      { label: 'کل بسته‌های شارژ', value: packError ? undefined : packs.length, icon: WalletCards, tone: 'violet' },
    ]} />
    <div className="customer-tabs" role="group" aria-label="بخش کیف پول"><button type="button" aria-pressed={tab === 'wallets'} onClick={() => setTab('wallets')}><UsersRound size={16} />کیف پول کاربران</button><button type="button" aria-pressed={tab === 'packs'} onClick={() => setTab('packs')}><Coins size={16} />بسته‌های شارژ</button></div>
    {tab === 'wallets' ? <CatalogTable key="wallets" columns={columns} data={wallets} loading={loading} error={walletError} onRefresh={() => void load()} keyExtractor={row => row.user_id} searchText={row => [customerName(row),row.username,row.phone_number].join(' ')}
      filter={{ label: 'همه اشتراک‌ها', options: [{ value: 'vip', label: 'VIP فعال' }, { value: 'regular', label: 'عادی' }], value: row => row.has_active_plan ? 'vip' : 'regular' }}
      pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="کیف پولی یافت نشد" />
      : <CatalogTable key="packs" columns={packColumns} data={packs.slice((packPage - 1) * 20, packPage * 20)} loading={loading} error={packError} onRefresh={() => void load()} keyExtractor={row => row.id} searchText={row => row.title}
        filter={{ label: 'همه وضعیت‌ها', options: [{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }], value: row => row.status }}
        pagination={{ page: packPage, perPage: 20, total: packs.length, onPageChange: setPackPage }} emptyMessage="بسته شارژی تعریف نشده است" emptyAction={<Button onClick={() => beginPack()}>بسته جدید</Button>} />}
    <CatalogModal isOpen={Boolean(adjusting)} onClose={() => { if (!saving) setAdjusting(null); }} title="تنظیم موجودی" size="lg" footer={<><Button variant="secondary" disabled={saving} onClick={() => setAdjusting(null)}>انصراف</Button><Button type="submit" form="wallet-adjust-form" loading={saving} disabled={!Number.isSafeInteger(amount) || amount <= 0 || (adjustmentMode === 'debit' && Boolean(adjusting && amount > adjusting.balance))}>{adjustmentMode === 'credit' ? 'افزایش موجودی' : 'کاهش موجودی'}</Button></>}>
      {adjusting && <form id="wallet-adjust-form" onSubmit={submitAdjustment}><fieldset disabled={saving} className="space-y-5"><CustomerIdentity user={adjusting} /><WalletAdjustmentPanel balance={adjusting.balance} amount={amount} mode={adjustmentMode} description={description} onAmountChange={setAmount} onModeChange={setAdjustmentMode} onDescriptionChange={setDescription} /></fieldset></form>}
    </CatalogModal>
    <WalletHistoryModal wallet={history} onClose={() => setHistory(null)} />
    <WalletPackModal open={Boolean(editingPack)} isNew={editingPack === 'new'} form={packForm} onChange={setPackForm} saving={saving} onClose={() => { if (!saving) setEditingPack(null); }} onSubmit={submitPack} />
    <ConfirmationModal isOpen={Boolean(deletingPack)} onClose={() => { if (!saving) setDeletingPack(null); }} onConfirm={removePack} title="حذف بسته شارژ" message={`بسته «${deletingPack?.title || ''}» حذف شود؟`} confirmText="حذف" loading={saving} />
  </div>;
}
