import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Coins, History, Pencil, Plus, Search, Trash2, UserRound, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';
import { walletsApi } from '@/api';
import type { AdminWalletDetailResponse, AdminWalletResponse, CreateWalletTopupPackRequest, WalletTopupPackResponse } from '@/types';
import { Badge, Button, ConfirmationModal, DataTable, Input, Modal, PageHeader, Select } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDate } from '@/utils/format';
import { WalletAdjustmentPanel, type WalletAdjustmentMode } from './WalletAdjustmentPanel';

type Tab = 'wallets' | 'packs';
const emptyPack: CreateWalletTopupPackRequest = { title: '', stars: 50, status: 'active', sort_order: 0 };

function fullName(wallet: AdminWalletResponse) {
  return `${wallet.first_name} ${wallet.last_name}`.trim() || 'کاربر بدون نام';
}

export default function WalletsPage() {
  const [tab, setTab] = useState<Tab>('wallets');
  const [wallets, setWallets] = useState<AdminWalletResponse[]>([]);
  const [packs, setPacks] = useState<WalletTopupPackResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<AdminWalletDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjusting, setAdjusting] = useState<AdminWalletResponse | null>(null);
  const [amount, setAmount] = useState(0);
  const [adjustmentMode, setAdjustmentMode] = useState<WalletAdjustmentMode>('credit');
  const [description, setDescription] = useState('اصلاح موجودی توسط مدیر');
  const [editingPack, setEditingPack] = useState<WalletTopupPackResponse | 'new' | null>(null);
  const [packForm, setPackForm] = useState<CreateWalletTopupPackRequest>(emptyPack);
  const [deletingPack, setDeletingPack] = useState<WalletTopupPackResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [walletResult, packResult] = await Promise.all([
        walletsApi.list({ page, per_page: 20 }),
        walletsApi.listPacks(),
      ]);
      setWallets(walletResult.data); setTotal(walletResult.total); setPacks(packResult);
    } catch { toast.error('دریافت اطلاعات کیف پول ناموفق بود'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);

  const visibleWallets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return wallets;
    return wallets.filter(item => `${fullName(item)} ${item.username} ${item.telegram_id}`.toLowerCase().includes(normalized));
  }, [query, wallets]);
  const pageBalance = wallets.reduce((sum, item) => sum + item.balance, 0);

  const showHistory = async (wallet: AdminWalletResponse) => {
    setDetailLoading(true);
    try { setDetail(await walletsApi.get(wallet.user_id)); }
    catch { toast.error('دریافت گردش کیف پول ناموفق بود'); }
    finally { setDetailLoading(false); }
  };
  const submitAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    if (!adjusting || !amount) return toast.error('مقدار افزایش یا کاهش را وارد کنید');
    if (adjustmentMode === 'debit' && amount > adjusting.balance) return toast.error('مقدار کاهش از موجودی فعلی بیشتر است');
    setSaving(true);
    try {
      const signedAmount = adjustmentMode === 'credit' ? amount : -amount;
      const result = await walletsApi.adjust(adjusting.user_id, signedAmount, description);
      setWallets(items => items.map(item => item.user_id === adjusting.user_id ? result.wallet : item));
      setAdjusting(null); toast.success('موجودی کیف پول ثبت شد');
    } catch { toast.error('تغییر موجودی انجام نشد؛ موجودی نمی‌تواند منفی شود'); }
    finally { setSaving(false); }
  };
  const beginPack = (pack?: WalletTopupPackResponse) => {
    setEditingPack(pack || 'new');
    setPackForm(pack ? { title: pack.title, stars: pack.stars, status: pack.status, sort_order: pack.sort_order } : emptyPack);
  };
  const submitPack = async (event: FormEvent) => {
    event.preventDefault();
    if (!packForm.title.trim() || packForm.stars < 1) return toast.error('عنوان و مقدار بسته را کامل کنید');
    setSaving(true);
    try {
      editingPack === 'new' ? await walletsApi.createPack(packForm) : await walletsApi.updatePack(editingPack!.id, packForm);
      setEditingPack(null); toast.success('بسته شارژ ذخیره شد'); await load();
    } catch { toast.error('ذخیره بسته شارژ ناموفق بود'); }
    finally { setSaving(false); }
  };
  const removePack = async () => {
    if (!deletingPack) return; setSaving(true);
    try { await walletsApi.deletePack(deletingPack.id); setDeletingPack(null); toast.success('بسته شارژ حذف شد'); await load(); }
    catch { toast.error('حذف بسته شارژ ناموفق بود'); }
    finally { setSaving(false); }
  };

  const columns: Column<AdminWalletResponse>[] = [
    { key: 'first_name', title: 'کاربر', render: (_, row) => <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/10 text-sky-600"><UserRound size={18} /></span><div><b>{fullName(row)}</b><p dir="ltr" className="mt-0.5 text-right text-[10px] text-[rgb(var(--color-text-muted))]">@{row.username || '—'}</p></div></div> },
    { key: 'balance', title: 'موجودی', render: value => <b className="text-sky-600">{Number(value).toLocaleString('fa-IR')} ⭐</b> },
    { key: 'has_active_plan', title: 'عضویت', render: value => value ? <Badge variant="purple" dot>VIP</Badge> : <Badge>عادی</Badge> },
    { key: 'transaction_count', title: 'گردش‌ها', render: value => <span>{Number(value).toLocaleString('fa-IR')} تراکنش</span> },
    { key: 'actions', title: 'عملیات', render: (_, row) => <div className="flex gap-1"><Button variant="ghost" size="sm" icon={<History size={14} />} onClick={() => void showHistory(row)}>گردش‌ها</Button><Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => { setAdjusting(row); setAmount(0); setAdjustmentMode('credit'); setDescription('اصلاح موجودی توسط مدیر'); }}>تنظیم</Button></div> },
  ];

  return <div className="space-y-5">
    <PageHeader title="کیف پول‌ها" action={tab === 'packs' ? <Button icon={<Plus size={16} />} onClick={() => beginPack()}>بسته جدید</Button> : undefined} />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="surface-card flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-500/10 text-sky-600"><WalletCards size={20} /></span><div><p className="text-xs text-[rgb(var(--color-text-muted))]">موجودی صفحه</p><b className="text-lg">{pageBalance.toLocaleString('fa-IR')} ⭐</b></div></div>
      <div className="surface-card flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-600"><UserRound size={20} /></span><div><p className="text-xs text-[rgb(var(--color-text-muted))]">کل کاربران</p><b className="text-lg">{total.toLocaleString('fa-IR')}</b></div></div>
      <div className="surface-card flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600"><Coins size={20} /></span><div><p className="text-xs text-[rgb(var(--color-text-muted))]">بسته‌های فعال</p><b className="text-lg">{packs.filter(pack => pack.status === 'active').length.toLocaleString('fa-IR')}</b></div></div>
    </div>
    <div className="flex w-fit rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-1">
      <button className={`rounded-xl px-4 py-2 text-xs font-bold transition ${tab === 'wallets' ? 'bg-[rgb(var(--color-surface))] text-sky-600 shadow-sm' : 'text-[rgb(var(--color-text-muted))]'}`} onClick={() => setTab('wallets')}>کیف پول کاربران</button>
      <button className={`rounded-xl px-4 py-2 text-xs font-bold transition ${tab === 'packs' ? 'bg-[rgb(var(--color-surface))] text-sky-600 shadow-sm' : 'text-[rgb(var(--color-text-muted))]'}`} onClick={() => setTab('packs')}>بسته‌های شارژ</button>
    </div>
    {tab === 'wallets' ? <>
      <div className="filter-bar"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="جستجو با نام، نام کاربری یا شناسه تلگرام" /></div>
      <DataTable columns={columns} data={visibleWallets} loading={loading} keyExtractor={row => row.user_id} pagination={{ page, perPage: 20, total, onPageChange: setPage }} emptyMessage="کیف پولی یافت نشد" />
    </> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{packs.map(pack => <article key={pack.id} className="surface-card relative overflow-hidden p-5"><div className="absolute -left-10 -top-12 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl" /><div className="relative flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20"><Coins size={21} /></span><Badge variant={pack.status === 'active' ? 'success' : 'default'} dot>{pack.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge></div><div className="relative mt-5"><p className="text-xs text-[rgb(var(--color-text-muted))]">{pack.title}</p><strong className="mt-1 block text-2xl">{pack.stars.toLocaleString('fa-IR')} <small className="text-sm text-amber-500">⭐</small></strong><p className="mt-2 text-[10px] text-[rgb(var(--color-text-muted))]">ترتیب نمایش: {pack.sort_order.toLocaleString('fa-IR')}</p></div><div className="relative mt-5 flex gap-2 border-t border-[rgb(var(--color-border))] pt-4"><Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => beginPack(pack)}>ویرایش</Button><Button variant="ghost" size="sm" className="text-rose-500" icon={<Trash2 size={14} />} onClick={() => setDeletingPack(pack)}>حذف</Button></div></article>)}</div>}

    <Modal isOpen={Boolean(adjusting)} onClose={() => setAdjusting(null)} title="تنظیم موجودی" description={adjusting ? fullName(adjusting) : ''} icon={<WalletCards size={18} />} footer={<><Button variant="secondary" onClick={() => setAdjusting(null)}>انصراف</Button><Button loading={saving} disabled={!amount || (adjustmentMode === 'debit' && Boolean(adjusting && amount > adjusting.balance))} onClick={() => document.getElementById('wallet-adjust-submit')?.click()}>{adjustmentMode === 'credit' ? 'افزایش موجودی' : 'کاهش موجودی'}</Button></>}>{adjusting && <form onSubmit={submitAdjustment}><WalletAdjustmentPanel balance={adjusting.balance} amount={amount} mode={adjustmentMode} description={description} onAmountChange={setAmount} onModeChange={setAdjustmentMode} onDescriptionChange={setDescription} /><button id="wallet-adjust-submit" className="hidden" /></form>}</Modal>
    <Modal isOpen={Boolean(detail) || detailLoading} onClose={() => setDetail(null)} title="تاریخچه کیف پول" size="lg" icon={<History size={18} />}>{detailLoading && !detail ? <p className="py-10 text-center text-sm text-[rgb(var(--color-text-muted))]">در حال دریافت گردش‌ها…</p> : detail && <div className="space-y-3"><div className="rounded-2xl bg-sky-500/10 p-4"><p className="text-xs text-sky-700">{fullName(detail.wallet)}</p><b className="mt-1 block text-xl">{detail.wallet.balance.toLocaleString('fa-IR')} ⭐</b></div>{detail.transactions.length === 0 ? <p className="py-8 text-center text-sm text-[rgb(var(--color-text-muted))]">تراکنشی ثبت نشده است</p> : detail.transactions.map(item => { const credit = item.balance_after >= item.balance_before; return <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--color-border))] p-3"><span className={`grid h-9 w-9 place-items-center rounded-xl ${credit ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{credit ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div className="min-w-0 flex-1"><b className="block truncate text-xs">{item.description || 'تراکنش کیف پول'}</b><small className="text-[10px] text-[rgb(var(--color-text-muted))]">{formatDate(item.created_at)} · {item.balance_before.toLocaleString('fa-IR')} ← {item.balance_after.toLocaleString('fa-IR')}</small></div><strong dir="ltr" className={credit ? 'text-emerald-600' : 'text-rose-600'}>{credit ? '+' : '−'}{item.amount.toLocaleString('fa-IR')} ⭐</strong></div>})}</div>}</Modal>
    <Modal isOpen={Boolean(editingPack)} onClose={() => setEditingPack(null)} title={editingPack === 'new' ? 'بسته شارژ جدید' : 'ویرایش بسته شارژ'} icon={<Coins size={18} />} footer={<><Button variant="secondary" onClick={() => setEditingPack(null)}>انصراف</Button><Button loading={saving} onClick={() => document.getElementById('pack-submit')?.click()}>ذخیره بسته</Button></>}><form onSubmit={submitPack} className="space-y-4"><Input label="عنوان بسته" value={packForm.title} onChange={event => setPackForm({ ...packForm, title: event.target.value })} /><div className="grid grid-cols-2 gap-3"><Input label="مقدار Stars" type="number" min="1" value={packForm.stars} onChange={event => setPackForm({ ...packForm, stars: Number(event.target.value) })} /><Input label="ترتیب نمایش" type="number" min="0" value={packForm.sort_order} onChange={event => setPackForm({ ...packForm, sort_order: Number(event.target.value) })} /></div><Select label="وضعیت" value={packForm.status} onChange={event => setPackForm({ ...packForm, status: event.target.value as 'active' | 'inactive' })} options={[{ value: 'active', label: 'فعال' }, { value: 'inactive', label: 'غیرفعال' }]} /><button id="pack-submit" className="hidden" /></form></Modal>
    <ConfirmationModal isOpen={Boolean(deletingPack)} onClose={() => setDeletingPack(null)} onConfirm={removePack} title="حذف بسته شارژ" message={`بسته «${deletingPack?.title || ''}» حذف شود؟`} confirmText="حذف" loading={saving} />
  </div>;
}
