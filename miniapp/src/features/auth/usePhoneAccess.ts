import { useEffect, useState } from 'react'
import { ApiClient, PHONE_ACCESS_EVENT } from '../../api/client'

interface PhoneStatus { required: boolean; verified: boolean }

export function usePhoneAccess(initDataRaw: string | null, bypass: boolean) {
  const [status, setStatus] = useState<PhoneStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const allowed = status !== null && (!status.required || status.verified)

  useEffect(() => {
    if (bypass || !initDataRaw) return
    const client = new ApiClient({ initDataRaw })
    let active = true
    let pending = false
    let onboarded = false
    let generation = 0
    const check = async () => {
      if (pending) return
      pending = true
      const current = generation
      try {
        // Capture signed start_param before the phone gate/contact can create
        // the account. A supplied JSON referral code is never trusted.
        if (!onboarded) { await client.post('/user', {}); onboarded = true }
        const next = await client.get<PhoneStatus>('/user/phone-verification')
        if (active && current === generation) { setStatus(next); setError(null) }
      } catch {
        if (active && current === generation) {
          setStatus(null)
          setError('بررسی دسترسی ممکن نشد. اتصال خود را بررسی و دوباره تلاش کنید.')
        }
      } finally { pending = false }
    }
    const denied = (event: Event) => {
      generation++
      if ((event as CustomEvent).detail === 'PHONE_VERIFICATION_REQUIRED') {
        setStatus({ required: true, verified: false }); setError(null)
      } else {
        setStatus(null); setError('بررسی دسترسی ممکن نشد. اتصال خود را بررسی و دوباره تلاش کنید.')
      }
    }
    const onFocus = () => { if (!document.hidden) void check() }
    window.addEventListener(PHONE_ACCESS_EVENT, denied)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    void check()
    const timer = window.setInterval(onFocus, allowed ? 30000 : 3000)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(PHONE_ACCESS_EVENT, denied)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [initDataRaw, bypass, revision, allowed])

  return { allowed: bypass || allowed, loading: !status && !error, error, refresh: () => setRevision((value) => value + 1) }
}
