import { useEffect, useState } from 'react'
import { ApiClient } from '../../../api/client'
import { type ManualPayment, formatToman, manualStatus } from '../../../features/commerce/manual'
import { useContent } from '../../../features/content/ContentProvider'
import { manualPreviewPayment } from '../../../features/content/manualPreview'
import { Icon } from '../../ui/Icon'
import { ManualCheckout } from './LazyManualCheckout'
import '../../../styles/manual-payment.css'

export function ManualHistory({ initDataRaw, preview = false, scenario = 'content' }: { initDataRaw?: string | null; preview?: boolean; scenario?: string }) {
  const { text, editorMode } = useContent()
  const isPreview = preview || editorMode
  const [rows, setRows] = useState<ManualPayment[]>([]), [page, setPage] = useState(1), [version, setVersion] = useState(0), [selected, setSelected] = useState<ManualPayment | null>(null), [error, setError] = useState(false), [loading, setLoading] = useState(false)
  useEffect(() => { setSelected(null); setPage(1) }, [scenario])
  useEffect(() => {
    if (isPreview || !initDataRaw) return
    let active = true; setLoading(true); setError(false)
    new ApiClient({ initDataRaw }).get<ManualPayment[]>(`/payment/manual/checkouts?page=${page}&per_page=10`).then(r => { if (active) setRows(r) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [initDataRaw, page, version, isPreview])
  const displayRows = isPreview ? scenario === 'empty' ? [] : ['awaiting_proof', 'submitted', 'approved', 'rejected', 'cancelled'].map((state, index) => manualPreviewPayment(index === 2 ? 'vip_plan' : index === 3 ? 'wallet_topup' : 'product', state)) : rows
  const displayLoading = isPreview ? scenario === 'manual-history-loading' : loading
  const displayError = isPreview ? scenario === 'manual-history-error' : error
  if ((!isPreview && !initDataRaw) || (!displayRows.length && !displayError && !displayLoading && page === 1)) return null
  return <section className="manual-history">
    <header><h3>{text('manual.history')}</h3><button type="button" onClick={() => setVersion(v => v + 1)}><Icon name="refresh" size={14} />{text('common.refresh')}</button></header>
    {displayLoading ? <p>{text('manual.history_loading')}</p> : displayError ? <p role="alert">{text('manual.history_error')}</p> : displayRows.map(row => <button type="button" className={`manual-history-row is-${row.status}`} key={row.id} onClick={() => setSelected(row)}>
      <span className="manual-history-symbol"><Icon name={row.purpose === 'vip_plan' ? 'crown' : row.purpose === 'wallet_topup' ? 'wallet' : 'shop'} size={19} /></span>
      <span className="manual-history-copy"><strong data-content-static>{row.title}</strong><small><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })}</time>{row.is_test && text('manual.test_suffix')}</small></span>
      <span className="manual-history-total"><b>{formatToman(row.toman)}</b><span>{text(('manual.' + row.status) as 'manual.submitted') || manualStatus[row.status]}</span></span>
    </button>)}
    {(page > 1 || displayRows.length === 10 || isPreview && scenario === 'manual-history-pages') && <div className="manual-history-pages"><button disabled={displayLoading || page === 1} onClick={() => setPage(p => p - 1)}>{text('notifications.previous')}</button><span>{page.toLocaleString('fa-IR')}</span><button disabled={displayLoading || (isPreview ? page >= 2 : rows.length < 10)} onClick={() => setPage(p => p + 1)}>{text('notifications.next')}</button></div>}
    {selected && <ManualCheckout key={selected.id} preview={isPreview} initial={selected} initDataRaw={initDataRaw || ''} onClose={() => { setSelected(null); setVersion(v => v + 1) }} onChanged={() => setVersion(v => v + 1)} />}
  </section>
}
