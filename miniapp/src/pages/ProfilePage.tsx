import { useCallback, useEffect, useMemo, useState } from 'react'
import { openInvoice } from '@telegram-apps/sdk'
import { ApiClient } from '../api/client'
import { PaymentResultModal, type PaymentResult } from '../components/commerce/PaymentResultModal'
import { PaymentStatusNotice } from '../components/commerce/PaymentStatusNotice'
import { StateCard } from '../components/feedback/CatalogStates'
import { ProfileQuickLinks } from '../components/profile/ProfileQuickLinks'
import { ProfileAccountCard } from '../components/profile/ProfileAccountCard'
import { ProfileActivity } from '../components/profile/ProfileActivity'
import { ProfileSkeleton } from '../components/profile/ProfileSkeleton'
import { AccountPageSkeleton } from '../components/profile/AccountPageSkeleton'
import { ProfileReferrals } from '../components/profile/ProfileReferrals'
import { WalletSections } from '../components/profile/WalletSections'
import { VipPlans } from '../components/profile/VipPlans'
import { VipCheckoutModal, type VipCheckout } from '../components/profile/VipCheckoutModal'
import { Icon } from '../components/ui/Icon'
import { useContent } from '../features/content/ContentProvider'
import type { PaginatedResponse } from '../features/catalog/types'
import type { SimulatedPayment, StarsInvoice, UserAccount, VipPlan, VipQuote, Wallet, WalletTopupPack } from '../features/commerce/types'
import { editorAccount, editorStandardAccount, editorTopupPacks, editorVipPlans, editorWallet } from '../features/content/editorFixtures'
import type { TelegramUser } from '../hooks/useTelegramAuth'

interface ProfilePageProps { initDataRaw: string | null; telegramUser: TelegramUser | null; preview?: boolean; scenario?: string; view?: 'profile' | 'wallet' | 'vip' }
type PaymentMethod = 'telegram_stars' | 'wallet'

export function ProfilePage({ initDataRaw, telegramUser, preview = false, scenario = 'vip', view = 'profile' }: ProfilePageProps) {
  const { text } = useContent()
  const [account, setAccount] = useState<UserAccount | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [plans, setPlans] = useState<VipPlan[]>([])
  const [packs, setPacks] = useState<WalletTopupPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeKind, setNoticeKind] = useState<PaymentResult['kind']>('success')
  const [testInvoice, setTestInvoice] = useState<StarsInvoice | null>(null)
  const [checkout, setCheckout] = useState<VipCheckout | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  const load = useCallback(async () => {
    if (preview) {
      setAccount(editorAccount); setWallet(editorWallet); setPlans(editorVipPlans); setPacks(editorTopupPacks)
      setError(null); setLoading(false); return
    }
    if (!initDataRaw) { setLoading(false); return }
    setError(null)
    try {
      const api = new ApiClient({ initDataRaw })
      if (telegramUser) await api.post<UserAccount>('/user', { first_name: telegramUser.firstName, last_name: telegramUser.lastName || '', username: telegramUser.username || '', telegram_id: telegramUser.id })
      const [nextAccount, nextWallet, planPage, nextPacks] = await Promise.all([
        api.get<UserAccount>('/user/me'), api.get<Wallet>('/payment/wallet'),
        api.get<PaginatedResponse<VipPlan>>('/vip/plan?page=1&per_page=100'), api.get<WalletTopupPack[]>('/payment/wallet/packs'),
      ])
      setAccount(nextAccount); setWallet(nextWallet)
      setPlans(planPage.data.filter((plan) => plan.status === 'active').sort((left, right) => left.tier - right.tier))
      setPacks(nextPacks)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'اطلاعات پروفایل دریافت نشد') }
    finally { setLoading(false) }
  }, [initDataRaw, preview, telegramUser])
  useEffect(() => { void load() }, [load])

  const visibleAccount = preview && scenario === 'standard' ? editorStandardAccount : account
  const visibleWallet = preview && scenario === 'empty-wallet' ? { balance: 0, transactions: [] } : preview && scenario === 'standard' ? { ...editorWallet, balance: 35 } : wallet
  const visibleLoading = preview ? scenario === 'loading' : loading
  const unavailable = preview && scenario === 'unavailable'
  const visibleError = preview && scenario === 'error-message' ? 'اطلاعات پروفایل دریافت نشد' : error
  const visibleNotice = preview && scenario === 'success' ? 'کیف پول شما با موفقیت شارژ شد.' : preview && scenario === 'payment-cancelled' ? text('payment.cancelled_message') : preview && scenario === 'payment-failed' ? 'پرداخت ناموفق بود. دوباره تلاش کنید.' : notice
  const visibleNoticeKind = preview && scenario === 'payment-cancelled' ? 'cancelled' : preview && scenario === 'payment-failed' ? 'error' : preview && scenario === 'success' ? 'success' : noticeKind
  const visibleTestInvoice: StarsInvoice | null = preview && scenario === 'payment-test' ? { payment_id: 'preview-payment', stars: 50, simulation_enabled: true, completed: false, purpose: 'wallet_topup' } : testInvoice
  const displayName = useMemo(() => [visibleAccount?.first_name || telegramUser?.firstName, visibleAccount?.last_name || telegramUser?.lastName].filter(Boolean).join(' ') || 'کاربر تلگرام', [telegramUser, visibleAccount])
  const activePlan = plans.find((plan) => plan.id === visibleAccount?.active_plan_id)

  const showResult = (kind: PaymentResult['kind'], message: string) => {
    setNotice(message)
    setNoticeKind(kind)
    setPaymentResult({ kind, title: text(kind === 'success' ? 'payment.success_title' : kind === 'cancelled' ? 'payment.cancelled_title' : 'payment.failed_title'), message })
  }
  const handleInvoice = async (invoice: StarsInvoice, successText: string) => {
    if (invoice.completed) { setNotice(successText); showResult('success', successText); await load(); return }
    if (invoice.simulation_enabled) { setTestInvoice(invoice); return }
    if (!invoice.invoice_url || !openInvoice.isAvailable()) throw new Error('پرداخت تلگرام در این نسخه در دسترس نیست.')
    const status = await openInvoice(invoice.invoice_url, 'url')
    if (status === 'paid') { setNotice(successText); showResult('success', successText); await load() }
    else if (status === 'failed') { const message = 'پرداخت ناموفق بود. دوباره تلاش کنید.'; showResult('error', message); throw new Error(message) }
    else { const message = 'پرداخت توسط شما لغو شد و مبلغی کسر نشد.'; showResult('cancelled', message) }
  }

  const preparePlan = async (plan: VipPlan, method: PaymentMethod) => {
    if (busyKey) return
    setBusyKey(`quote:${plan.id}:${method}`); setError(null); setNotice(null)
    try {
      const quote: VipQuote = preview || !initDataRaw ? {
        plan_id: plan.id, plan_title: plan.title, original_stars: plan.stars_price,
        credit_stars: activePlan && plan.tier > activePlan.tier ? 72 : 0,
        payable_stars: activePlan && plan.tier > activePlan.tier ? Math.max(1, plan.stars_price - 72) : plan.stars_price,
        remaining_days: activePlan ? 24 : 0, is_upgrade: Boolean(activePlan && plan.tier > activePlan.tier),
        current_plan_id: activePlan?.id, current_plan_title: activePlan?.title, current_tier: activePlan?.tier || 0, target_tier: plan.tier,
        current_expire_at: visibleAccount?.plan_expire_at,
      } : await new ApiClient({ initDataRaw }).post<VipQuote>('/payment/vip/quote', { plan_id: plan.id })
      setCheckout({ plan, method, quote })
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'محاسبه مبلغ پلن ناموفق بود'; setError(message); showResult('error', message) }
    finally { setBusyKey(null) }
  }

  const buyPlan = async () => {
    if (!checkout || preview || !initDataRaw || busyKey) return
    const selected = checkout
    setBusyKey(`${selected.plan.id}:${selected.method}`); setError(null); setNotice(null); setTestInvoice(null); setCheckout(null)
    try {
      const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/vip/checkout', { plan_id: selected.plan.id, method: selected.method })
      await handleInvoice(invoice, selected.quote.is_upgrade ? 'پلن VIP شما با موفقیت ارتقا یافت.' : 'اشتراک VIP شما با موفقیت فعال شد.')
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'خرید پلن ناموفق بود'; setError(message); showResult('error', message) }
    finally { setBusyKey(null) }
  }

  const topup = async (pack: WalletTopupPack) => {
    if (preview || !initDataRaw || busyKey) return
    setBusyKey(`topup:${pack.id}`); setError(null); setNotice(null); setTestInvoice(null)
    try { const invoice = await new ApiClient({ initDataRaw }).post<StarsInvoice>('/payment/wallet/topup', { pack_id: pack.id }); await handleInvoice(invoice, 'کیف پول شما با موفقیت شارژ شد.') }
    catch (reason) { const message = reason instanceof Error ? reason.message : 'شارژ کیف پول ناموفق بود'; setError(message); showResult('error', message) }
    finally { setBusyKey(null) }
  }

  const simulate = async (outcome: 'succeeded' | 'failed' | 'cancelled') => {
    if (preview || !initDataRaw || !testInvoice || busyKey) return
    setBusyKey(`simulate:${outcome}`); setError(null); setNotice(null)
    try {
      const result = await new ApiClient({ initDataRaw }).post<SimulatedPayment>('/payment/stars/test/simulate', { payment_id: testInvoice.payment_id, outcome })
      setTestInvoice(null)
      if (result.status === 'succeeded') { const message = 'شبیه‌سازی موفق بود؛ موجودی کیف پول و اشتراک واقعی تغییر نکرد.'; setNotice(message); showResult('success', message); await load() }
      else { const cancelled = result.status === 'cancelled'; const message = cancelled ? 'پرداخت آزمایشی لغو شد.' : 'پرداخت آزمایشی ناموفق ثبت شد.'; setError(message); showResult(cancelled ? 'cancelled' : 'error', message) }
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'شبیه‌سازی پرداخت ناموفق بود'; setError(message); showResult('error', message) }
    finally { setBusyKey(null) }
  }

  if (visibleLoading) return view === 'profile' ? <ProfileSkeleton /> : <AccountPageSkeleton />
  if (unavailable || !visibleAccount || !visibleWallet) return <div className="profile-unavailable"><StateCard title={view === 'vip' ? 'پلن‌های VIP در دسترس نیست' : view === 'wallet' ? 'کیف پول در دسترس نیست' : 'پروفایل در دسترس نیست'} body={visibleError || 'دوباره تلاش کنید.'} /><button className="profile-retry" onClick={() => { if (!preview) { setLoading(true); void load() } }}><Icon name="refresh" size={17} />{text('common.retry')}</button></div>

  return <div className={`page profile-page ${view === 'vip' ? 'vip-page' : view === 'profile' ? 'profile-home' : ''}`}>
    {view === 'profile' && <ProfileAccountCard account={visibleAccount} balance={visibleWallet.balance} displayName={displayName} username={visibleAccount.username || telegramUser?.username} photoUrl={visibleAccount.photo_url ?? telegramUser?.photoUrl} initDataRaw={initDataRaw} activePlan={activePlan} />}
    {(visibleNotice || visibleError) && <PaymentStatusNotice
      kind={visibleNotice ? visibleNoticeKind : 'error'}
      message={visibleNotice || visibleError!}
      onDismiss={() => { setNotice(null); setError(null) }}
    />}
    {visibleTestInvoice && <section className="payment-simulator"><div><strong>شبیه‌ساز پرداخت سراسری</strong><span>این شبیه‌سازی موجودی کیف پول یا اشتراک واقعی ایجاد نمی‌کند.</span></div><div className="payment-simulator-actions"><button disabled={Boolean(busyKey)} onClick={() => void simulate('succeeded')}>موفق</button><button disabled={Boolean(busyKey)} onClick={() => void simulate('failed')}>ناموفق</button><button disabled={Boolean(busyKey)} onClick={() => void simulate('cancelled')}>لغو</button></div></section>}

    {view === 'profile' && <><ProfileQuickLinks /><ProfileActivity transactions={visibleWallet.transactions} /><ProfileReferrals initDataRaw={initDataRaw} preview={preview} scenario={scenario} onAccountRefresh={load} /></>}

    {view === 'wallet' && <WalletSections wallet={visibleWallet} packs={preview && scenario === 'no-packs' ? [] : packs} busyKey={busyKey} onTopup={(pack) => void topup(pack)} preview={preview} />}
    {view === 'vip' && <VipPlans account={visibleAccount} plans={preview && scenario === 'no-plans' ? [] : plans} busyKey={busyKey} onChoose={(plan, method) => void preparePlan(plan, method)} />}

    {checkout && <VipCheckoutModal checkout={checkout} balance={visibleWallet.balance} preview={preview} onMethod={method => setCheckout(current => current ? { ...current, method } : null)} onClose={() => setCheckout(null)} onConfirm={() => void buyPlan()} />}
    <PaymentResultModal result={paymentResult} onClose={() => setPaymentResult(null)} />
  </div>
}
