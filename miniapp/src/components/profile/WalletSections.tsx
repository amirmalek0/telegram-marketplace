import { useState } from 'react'
import type { Wallet, WalletTopupPack } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { Icon } from '../ui/Icon'
import { WalletHistory } from './WalletHistory'

interface Props { wallet: Wallet; packs: WalletTopupPack[]; busyKey: string | null; onTopup: (pack: WalletTopupPack) => void; preview?: boolean; only?: 'balance' | 'packs' | 'history' }
export function WalletSections({ wallet, packs, busyKey, onTopup, preview, only }: Props) {
  const { text } = useContent()
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const selected = packs.find(pack => pack.id === selectedID)
  return <div className="wallet-sections">
    {(!only || only === 'balance') && <section className="wallet-balance-card">
      <div className="wallet-balance-heading"><span><Icon name="wallet" size={19} />{text('wallet.ready_balance')}</span><span className="wallet-store-label">{text('wallet.store_credit')}</span></div>
      <strong className="wallet-balance-number"><bdi>{wallet.balance.toLocaleString('fa-IR')}</bdi><i aria-label="Stars">⭐</i></strong>
      <p>{text('wallet.ready_hint')}</p>
      <div className="wallet-balance-rule"><Icon name="info" size={15} />{text('wallet.credit_hint')}</div>
    </section>}
    {(!only || only === 'packs') && <section className="wallet-recharge" aria-labelledby="wallet-packs-title">
      <div className="account-section-title"><span><Icon name="plus" size={18} /><h3 id="wallet-packs-title">{text('wallet.choose_pack')}</h3></span><small>{text('wallet.pay_stars')}</small></div>
      {packs.length === 0 ? <div className="account-empty"><Icon name="wallet" size={28} /><h3>{text('wallet.no_packs')}</h3><p>{text('wallet.no_packs_hint')}</p></div> : <>
        <div className="wallet-pack-options" role="group" aria-labelledby="wallet-packs-title">
          {packs.map(pack => <button type="button" key={pack.id} className={selected?.id === pack.id ? 'is-selected' : ''} aria-pressed={selected?.id === pack.id} disabled={Boolean(busyKey)} onClick={() => setSelectedID(pack.id)}>
            <span className="wallet-pack-check" aria-hidden="true">{selected?.id === pack.id && <Icon name="check" size={19} />}</span><strong><bdi>{pack.stars.toLocaleString('fa-IR')}</bdi><i aria-label="Stars">⭐</i></strong><span className="wallet-pack-title">{pack.title}</span>
          </button>)}
        </div>
        <div className="wallet-recharge-checkout">
          <p aria-live="polite">{selected ? <><span>{text('wallet.after_topup')}</span><bdi>{(wallet.balance + selected.stars).toLocaleString('fa-IR')} ⭐</bdi></> : <span>{text('wallet.select_hint')}</span>}</p>
          <button type="button" className="account-primary" disabled={!selected || Boolean(busyKey) || preview} aria-busy={Boolean(busyKey?.startsWith('topup:'))} onClick={() => { if (selected) onTopup(selected) }}><Icon name={busyKey?.startsWith('topup:') ? 'clock' : 'star'} size={18} /><span>{busyKey?.startsWith('topup:') ? text('wallet.preparing') : text('wallet.topup_confirm')}</span>{selected && <bdi>{selected.stars.toLocaleString('fa-IR')}</bdi>}</button>
          {preview && <p className="account-footnote">{text('membership.preview')}</p>}
        </div>
      </>}
    </section>}
    {(!only || only === 'history') && <WalletHistory transactions={wallet.transactions} />}
  </div>
}
