import { Icon } from '../../ui/Icon'
import { bankLogos } from './bankLogos'
import { useState } from 'react'
import { useContent } from '../../../features/content/ContentProvider'
import type { BankCard as Card } from '../../../features/commerce/manual'

export function BankCard({ card, selected, onSelect }: { card: Card; selected: boolean; onSelect: () => void }) {
  const Logo = bankLogos[card.bank.key]
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(card.number); setCopied(true); setCopyError(false) } catch { setCopied(false); setCopyError(true) } }
  const { text } = useContent()
  return <article className={`manual-card ${selected ? 'is-selected' : ''}`}>
    <label className="manual-card-select"><input type="radio" name="destination-card" checked={selected} onChange={onSelect} /><span>{card.bank.name}</span><i>{Logo && <Logo width={28} height={28} />}</i></label>
    <div className="manual-card-number"><bdi>{card.number.replace(/(.{4})/g, '$1 ').trim()}</bdi><button type="button" onClick={() => void copy()} aria-label={text('manual.copy_card')}><Icon name={copied ? 'check' : 'copy'} size={15} /><span>{copied ? text('manual.copied') : text('manual.copy')}</span></button></div>
    {copyError && <small role="status">{text('manual.copy_error')}</small>}
    <span className="manual-card-owner">{text('manual.owner').replace('{owner}', card.owner)}</span>
  </article>
}
