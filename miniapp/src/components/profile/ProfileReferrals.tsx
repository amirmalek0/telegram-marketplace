import { useEffect, useState } from 'react'
import { shareURL, requestPhoneAccess } from '@telegram-apps/sdk'
import { ApiClient } from '../../api/client'
import { useContent } from '../../features/content/ContentProvider'
import type { ReferralSummary, RewardTrigger } from '../../features/referrals/types'
import { Icon } from '../ui/Icon'
import '../../styles/referrals.css'

const demo: ReferralSummary = { enabled: true, inviter_stars: 10, invitee_stars: 10, reward_trigger: 'phone_verified', link: 'https://t.me/example_bot?start=ref_preview', total: 5, rewarded: 3, earned_stars: 30, invitation: null }

export function ProfileReferrals({ initDataRaw, preview, scenario, onAccountRefresh }: { initDataRaw: string | null; preview: boolean; scenario: string; onAccountRefresh: () => Promise<void> }) {
  const { text } = useContent()
  const [data, setData] = useState<ReferralSummary | null>(null)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [contactBusy, setContactBusy] = useState(false)
  useEffect(() => {
    if (preview) {
      setError(scenario === 'referral-error')
      setData(scenario === 'referral-loading' ? null : { ...demo, enabled: scenario !== 'referral-disabled',
        reward_trigger: scenario === 'referral-purchase' ? 'first_purchase' : scenario === 'referral-open' ? 'bot_open' : 'phone_verified',
        ...(scenario === 'referral-empty' ? { total: 0, rewarded: 0, earned_stars: 0 } : {}),
        invitation: scenario === 'referral-pending' ? { reward_trigger: 'phone_verified', invitee_stars: 10, rewarded_at: null } : scenario === 'referral-rewarded' ? { reward_trigger: 'first_purchase', invitee_stars: 10, rewarded_at: new Date().toISOString() } : null,
      }); return
    }
    if (!initDataRaw) return
    const abort = new AbortController()
    setError(false)
    new ApiClient({ initDataRaw }).get<ReferralSummary>('/referral/me', abort.signal).then(async next => {
      if (abort.signal.aborted) return
      setData(next)
      if (revision > 0) await onAccountRefresh()
    }).catch(() => { if (!abort.signal.aborted) setError(true) })
    return () => abort.abort()
  }, [initDataRaw, preview, scenario, revision, onAccountRefresh])
  const refresh = () => { if (!preview) setRevision(value => value + 1) }
  const triggerText = (trigger: RewardTrigger) => text(trigger === 'bot_open' ? 'referral.trigger_open' : trigger === 'phone_verified' ? 'referral.trigger_phone' : 'referral.trigger_purchase')
  const copy = async () => {
    if (preview || !data?.link) return
    try { await navigator.clipboard.writeText(data.link); setNotice(text('referral.copied')) }
    catch { setNotice(text('referral.copy_failed')) }
  }
  const share = () => {
    if (preview || !data?.link) return
    if (shareURL.isAvailable()) shareURL(data.link, text('referral.share_message'))
    else void copy()
  }
  const verify = async () => {
    if (preview || contactBusy) return
    if (!requestPhoneAccess.isAvailable()) { setNotice(text('phone.unsupported')); return }
    setContactBusy(true)
    try { const result = await requestPhoneAccess({ timeout: 60000 }); setNotice(text(result === 'sent' ? 'phone.waiting' : 'phone.cancelled')); refresh() }
    catch { setNotice(text('phone.share_error')) }
    finally { setContactBusy(false) }
  }
  return <section className="profile-referrals" aria-labelledby="referral-title">
    <header><span className="referral-symbol"><Icon name="gift" size={22} /></span><div><h3 id="referral-title">{text('referral.title')}</h3><p>{text('referral.subtitle')}</p></div><button type="button" className="referral-refresh" onClick={refresh} aria-label={text('common.refresh')}><Icon name="refresh" size={17} /></button></header>
    {error ? <div className="referral-state"><p role="alert">{text('referral.error')}</p><button onClick={refresh}>{text('common.retry')}</button></div> : !data ? <div className="skeleton referral-loading" role="status" aria-label={text('referral.loading')} /> : <>
      {!data.enabled ? <p className="referral-state">{text('referral.disabled')}</p> : <>
        <div className="referral-rewards"><div><span>{text('referral.your_reward')}</span><strong>{data.inviter_stars.toLocaleString('fa-IR')}<Icon name="star" size={19} /></strong></div><span className="referral-reward-plus">+</span><div><span>{text('referral.friend_reward')}</span><strong>{data.invitee_stars.toLocaleString('fa-IR')}<Icon name="star" size={19} /></strong></div></div>
        <div className="referral-actions"><button className="referral-share" onClick={share}><Icon name="send" size={17} />{text('referral.share')}</button><button className="referral-copy-action" onClick={() => void copy()} aria-label={text('referral.copy')}><Icon name="copy" size={18} /></button></div>
        <details className="referral-details" key={scenario} open={preview && scenario.startsWith('referral-') ? true : undefined}>
          <summary><span>{text('referral.details')}</span><Icon name="arrow" size={15} /></summary>
          <p className="referral-rule"><Icon name="info" size={16} /><span>{triggerText(data.reward_trigger)}</span></p>
          <div className="referral-link"><input aria-label={text('referral.link')} dir="ltr" readOnly value={data.link} onFocus={event => event.target.select()} /><button onClick={() => void copy()} aria-label={text('referral.copy')}><Icon name="copy" size={18} /></button></div>
          <dl className="referral-stats"><div><dt>{text('referral.total')}</dt><dd>{data.total.toLocaleString('fa-IR')}</dd></div><div><dt>{text('referral.rewarded')}</dt><dd>{data.rewarded.toLocaleString('fa-IR')}</dd></div><div><dt>{text('referral.earned')}</dt><dd>{data.earned_stars.toLocaleString('fa-IR')}<Icon name="star" size={12} /></dd></div></dl>
          <p className="referral-footnote">{text('referral.wallet_note')}</p>
        </details>
      </>}
      {!data.enabled && <dl className="referral-stats"><div><dt>{text('referral.total')}</dt><dd>{data.total.toLocaleString('fa-IR')}</dd></div><div><dt>{text('referral.rewarded')}</dt><dd>{data.rewarded.toLocaleString('fa-IR')}</dd></div><div><dt>{text('referral.earned')}</dt><dd>{data.earned_stars.toLocaleString('fa-IR')}<Icon name="star" size={12} /></dd></div></dl>}
      {data.invitation && <div className="referral-invitation"><Icon name={data.invitation.rewarded_at ? 'check' : 'clock'} size={18} /><div><strong>{text(data.invitation.rewarded_at ? 'referral.gift_received' : 'referral.gift_pending').replace('{amount}', data.invitation.invitee_stars.toLocaleString('fa-IR'))}</strong>{!data.invitation.rewarded_at && <><p>{triggerText(data.invitation.reward_trigger)}</p>{data.enabled && data.invitation.reward_trigger === 'phone_verified' && <button disabled={contactBusy} onClick={() => void verify()}>{text(contactBusy ? 'phone.requesting' : 'phone.share')}</button>}</>}</div></div>}
    </>}
    {notice && <p className="referral-notice" role="status">{notice}</p>}
  </section>
}
