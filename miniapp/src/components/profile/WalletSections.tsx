import type { Wallet, WalletTopupPack } from '../../features/commerce/types'
import { formatDate } from '../../utils/format'
import { Icon } from '../ui/Icon'

interface WalletSectionsProps {
  wallet: Wallet
  packs: WalletTopupPack[]
  busyKey: string | null
  onTopup: (pack: WalletTopupPack) => void
}

const creditTypes = new Set(['topup', 'reward', 'refund'])

export function WalletSections({ wallet, packs, busyKey, onTopup }: WalletSectionsProps) {
  return <>
    <section className="wallet-page-summary">
      <span><Icon name="wallet" size={24} /></span>
      <div>
        <small>موجودی قابل استفاده</small>
        <strong>{wallet.balance.toLocaleString('fa-IR')} <i>⭐</i></strong>
        <p>اعتبار آماده برای خرید محصول و اشتراک VIP</p>
      </div>
    </section>

    <section className="wallet-card" aria-labelledby="wallet-packs-title">
      <div className="profile-section-heading">
        <div><h3 id="wallet-packs-title">بسته‌های شارژ</h3><p>با Stars کیف پولتان را برای خریدهای بعدی آماده کنید</p></div>
      </div>
      <div className="wallet-topups">
        {packs.map((pack) => <button key={pack.id} disabled={Boolean(busyKey)} aria-busy={busyKey === `topup:${pack.id}`} onClick={() => onTopup(pack)}>
          <span className="pack-star" aria-hidden="true">★</span>
          <b>{pack.stars.toLocaleString('fa-IR')}</b>
          <small>{pack.title}</small>
          <span className="pack-action"><span>شارژ کیف پول</span><Icon name={busyKey === `topup:${pack.id}` ? 'clock' : 'plus'} size={16} /></span>
        </button>)}
      </div>
    </section>

    <section className="wallet-history" aria-labelledby="wallet-history-title">
      <div className="wallet-history-title"><h3 id="wallet-history-title">تاریخچه کیف پول</h3><span>{wallet.transactions.length.toLocaleString('fa-IR')} تراکنش</span></div>
      {wallet.transactions.length === 0 ? <p className="wallet-history-empty">هنوز تراکنشی در کیف پول شما ثبت نشده است.</p> : wallet.transactions.slice(0, 8).map((item) => {
        const credit = creditTypes.has(item.type) || (item.type === 'admin_adjust' && item.balance_after >= item.balance_before)
        return <div className="wallet-history-row" key={item.id}>
          <span className={`history-icon ${credit ? 'is-credit' : 'is-debit'}`}><Icon name={credit ? 'plus' : 'arrow'} size={17} /></span>
          <p><b>{item.description}</b><small>{formatDate(item.created_at)}</small></p>
          <strong className={credit ? 'is-credit' : 'is-debit'}>{credit ? '+' : '−'}{item.amount.toLocaleString('fa-IR')} ⭐</strong>
        </div>
      })}
    </section>
  </>
}
