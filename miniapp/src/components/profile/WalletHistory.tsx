import { useState } from 'react'
import type { WalletTransaction } from '../../features/commerce/types'
import { useContent } from '../../features/content/ContentProvider'
import { formatDateTime } from '../../utils/format'
import { Icon } from '../ui/Icon'

type Filter = 'all' | 'credit' | 'debit'
export function WalletHistory({ transactions }: { transactions: WalletTransaction[] }) {
  const { text } = useContent()
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(8)
  const credit = (item: WalletTransaction) => item.balance_after > item.balance_before
  const filtered = transactions.filter(item => filter === 'all' || (filter === 'credit' ? credit(item) : !credit(item)))
  return <section className="wallet-ledger" aria-labelledby="wallet-history-title">
    <div className="account-section-title"><span><Icon name="orders" size={17} /><h3 id="wallet-history-title">{text('wallet.activity')}</h3></span></div>
    {transactions.length > 0 && <div className="account-segmented" role="group" aria-label={text('wallet.filter')}>
      {(['all', 'credit', 'debit'] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(8) }}>{text(value === 'all' ? 'wallet.all' : value === 'credit' ? 'wallet.credit' : 'wallet.debit')}</button>)}
    </div>}
    {filtered.length === 0 ? <div className="account-empty is-compact"><Icon name="orders" size={25} /><p>{text(transactions.length ? 'wallet.no_matches' : 'wallet.no_history')}</p></div> : <div className="wallet-ledger-list">{filtered.slice(0, limit).map(item => <article className="wallet-ledger-row" key={item.id}>
      <span className={`wallet-ledger-icon ${credit(item) ? 'is-credit' : ''}`}><Icon name={credit(item) ? 'plus' : 'orders'} size={17} /></span>
      <div className="wallet-ledger-copy"><h4>{item.description}</h4><time dateTime={item.created_at}>{formatDateTime(item.created_at)}</time></div>
      <strong className={`wallet-ledger-amount ${credit(item) ? 'is-credit' : ''}`}><bdi dir="ltr">{credit(item) ? '+' : '−'}{Math.abs(item.amount).toLocaleString('fa-IR')}</bdi><i aria-label="Stars">⭐</i></strong>
    </article>)}</div>}
    {filtered.length > limit && <button type="button" className="account-more" onClick={() => setLimit(value => value + 8)}>{text('wallet.show_more')}<Icon name="back" size={15} /></button>}
  </section>
}
