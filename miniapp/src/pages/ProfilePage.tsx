import { useCallback, useEffect, useMemo, useState } from 'react'
import { openInvoice } from '@telegram-apps/sdk'
import { ApiClient } from '../api/client'
import { StateCard } from '../components/feedback/CatalogStates'
import { Icon } from '../components/ui/Icon'
import type { PaginatedResponse } from '../features/catalog/types'
import type { SimulatedPayment, StarsInvoice, UserAccount, VipPlan, Wallet } from '../features/commerce/types'
import type { TelegramUser } from '../hooks/useTelegramAuth'
import { formatDate } from '../utils/format'

interface ProfilePageProps {
  initDataRaw: string | null
  telegramUser: TelegramUser | null
}

type PaymentMethod = 'telegram_stars' | 'wallet'

const topupOptions = [25, 50, 100, 250]

export function ProfilePage({ initDataRaw, telegramUser }: ProfilePageProps) {
  const [account, setAccount] = useState<UserAccount | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [plans, setPlans] = useState<VipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [testInvoice, setTestInvoice] = useState<StarsInvoice | null>(null)

  const load = useCallback(async () => {
    if (!initDataRaw) return
    setError(null)
    try {
      const api = new ApiClient({ initDataRaw })
      if (telegramUser) {
        await api.post<UserAccount>('/user', {
          first_name: telegramUser.firstName,
          last_name: telegramUser.lastName || '',
          username: telegramUser.username || '',
          telegram_id: telegramUser.id,
        })
      }
      const [nextAccount, nextWallet, planPage] = await Promise.all([
        api.get<UserAccount>('/user/me'),
        api.get<Wallet>('/payment/wallet'),
        api.get<PaginatedResponse<VipPlan>>('/vip/plan?page=1&per_page=100'),
      ])
      setAccount(nextAccount)
      setWallet(nextWallet)
      setPlans(planPage.data.filter((plan) => plan.status === 'active'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'اطلاعات پروفایل دریافت نشد')
    } finally {
      setLoading(false)
    }
  }, [initDataRaw, telegramUser])

  useEffect(() => { void load() }, [load])

  const displayName = useMemo(() => {
    const value = [account?.first_name || telegramUser?.firstName, account?.last_name || telegramUser?.lastName].filter(Boolean).join(' ')
    return value || 'کاربر تلگرام'
  }, [account, telegramUser])

  const handleInvoice = async (invoice: StarsInvoice, successText: string) => {
    if (invoice.completed) {
      setNotice(successText)
      await load()
      return
    }
    if (invoice.simulation_enabled) {
      setTestInvoice(invoice)
      return
    }
    if (!invoice.invoice_url || !openInvoice.isAvailable()) throw new Error('پرداخت تلگرام در این نسخه در دسترس نیست.')
    const status = await openInvoice(invoice.invoice_url, 'url')
    if (status === 'paid') {
      setNotice(successText)
      await load()
    } else if (status === 'failed') throw new Error('پرداخت ناموفق بود. دوباره تلاش کنید.')
  }

  const buyPlan = async (plan: VipPlan, method: PaymentMethod) => {
    if (!initDataRaw || busyKey) return
    setBusyKey(`${plan.id}:${method}`)
    setError(null); setNotice(null); setTestInvoice(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/vip/checkout', { plan_id: plan.id, method })
      await handleInvoice(invoice, 'اشتراک VIP شما با موفقیت فعال شد.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'خرید پلن ناموفق بود')
    } finally { setBusyKey(null) }
  }

  const topup = async (stars: number) => {
    if (!initDataRaw || busyKey) return
    setBusyKey(`topup:${stars}`)
    setError(null); setNotice(null); setTestInvoice(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/wallet/topup', { stars })
      await handleInvoice(invoice, 'کیف پول شما با موفقیت شارژ شد.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'شارژ کیف پول ناموفق بود')
    } finally { setBusyKey(null) }
  }

  const simulate = async (outcome: 'succeeded' | 'failed' | 'cancelled') => {
    if (!initDataRaw || !testInvoice || busyKey) return
    setBusyKey(`simulate:${outcome}`)
    setError(null)
    try {
      const result = await new ApiClient({ initDataRaw }).post<SimulatedPayment>('/payment/stars/test/simulate', { payment_id: testInvoice.payment_id, outcome })
      setTestInvoice(null)
      if (result.status === 'succeeded') {
        setNotice(result.purpose === 'wallet_topup' ? 'شارژ آزمایشی کیف پول انجام شد.' : 'خرید آزمایشی پلن VIP انجام شد.')
        await load()
      } else setError(result.status === 'cancelled' ? 'پرداخت آزمایشی لغو شد.' : 'پرداخت آزمایشی ناموفق ثبت شد.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'شبیه‌سازی پرداخت ناموفق بود')
    } finally { setBusyKey(null) }
  }

  if (loading) return <div className="profile-page"><div className="profile-hero skeleton" /><div className="profile-card skeleton profile-loading" /><div className="profile-card skeleton profile-loading" /></div>
  if (!account || !wallet) return <StateCard title="پروفایل در دسترس نیست" body={error || 'دوباره تلاش کنید.'} />

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-avatar">
          {telegramUser?.photoUrl ? <img src={telegramUser.photoUrl} alt="" /> : <span>{displayName.slice(0, 1)}</span>}
        </div>
        <div className="profile-identity"><span>حساب تلگرام</span><h2>{displayName}</h2>{(account.username || telegramUser?.username) && <p dir="ltr">@{account.username || telegramUser?.username}</p>}</div>
        {account.has_active_plan && <span className="profile-vip-chip"><Icon name="crown" size={14} />VIP</span>}
      </section>

      {error && <p className="purchase-error">{error}</p>}
      {notice && <p className="purchase-notice"><Icon name="check" size={15} />{notice}</p>}
      {testInvoice && <section className="payment-simulator"><div><strong>شبیه‌ساز پرداخت سراسری</strong><span>هیچ استاری مصرف نمی‌شود؛ نتیجه را انتخاب کنید.</span></div><div className="payment-simulator-actions"><button disabled={Boolean(busyKey)} onClick={() => void simulate('succeeded')}>موفق</button><button disabled={Boolean(busyKey)} onClick={() => void simulate('failed')}>ناموفق</button><button disabled={Boolean(busyKey)} onClick={() => void simulate('cancelled')}>لغو</button></div></section>}

      <section className="profile-card wallet-card">
        <div className="profile-section-head"><span><Icon name="sparkles" size={18} /></span><div><h3>کیف پول</h3><p>اعتبار قابل استفاده برای همه خریدها</p></div><strong>{wallet.balance.toLocaleString('fa-IR')} ⭐</strong></div>
        <div className="wallet-topups">{topupOptions.map((value) => <button key={value} disabled={Boolean(busyKey)} onClick={() => void topup(value)}><Icon name="plus" size={13} /><b>{value.toLocaleString('fa-IR')}</b><span>استار</span></button>)}</div>
        {wallet.transactions.length > 0 && <div className="wallet-history"><h4>آخرین گردش‌ها</h4>{wallet.transactions.slice(0, 4).map((item) => <div key={item.id}><span className={item.type === 'topup' || item.type === 'reward' || item.type === 'refund' ? 'is-credit' : 'is-debit'}>{item.type === 'topup' || item.type === 'reward' || item.type === 'refund' ? '+' : '−'}{item.amount.toLocaleString('fa-IR')} ⭐</span><p><b>{item.description}</b><small>{formatDate(item.created_at)}</small></p></div>)}</div>}
      </section>

      <section className="profile-card vip-card">
        <div className="profile-section-head"><span><Icon name="crown" size={19} /></span><div><h3>اشتراک VIP</h3><p>{account.has_active_plan && account.plan_expire_at ? `فعال تا ${formatDate(account.plan_expire_at)}` : 'دسترسی رایگان به محصولات ویژه'}</p></div></div>
        <div className="vip-plan-list">{plans.map((plan) => {
          const walletReady = wallet.balance >= plan.stars_price
          return <article className="vip-plan" key={plan.id}><div className="vip-plan-copy"><small>{plan.duration.toLocaleString('fa-IR')} روز دسترسی</small><h4>{plan.title}</h4><strong>{plan.stars_price.toLocaleString('fa-IR')} ⭐</strong></div><div className="vip-plan-actions"><button disabled={Boolean(busyKey)} onClick={() => void buyPlan(plan, 'telegram_stars')}>پرداخت با Stars</button><button className="wallet-buy" disabled={Boolean(busyKey) || !walletReady} onClick={() => void buyPlan(plan, 'wallet')}>{walletReady ? 'خرید از کیف پول' : 'موجودی ناکافی'}</button></div></article>
        })}</div>
      </section>
    </div>
  )
}
