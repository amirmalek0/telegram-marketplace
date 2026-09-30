import { useCallback, useEffect, useMemo, useState } from 'react'
import { TicketApi } from './ticketApi'
import type { Ticket } from './types'

export function useTickets(initDataRaw: string | null, ready: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const api = useMemo(() => initDataRaw ? new TicketApi(initDataRaw) : null, [initDataRaw])

  const reload = useCallback(async () => {
    if (!api || !ready) return

    setLoading(true)
    setError(null)
    try {
      const response = await api.listTickets()
      setTickets(response.data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'دریافت تیکت‌ها ناموفق بود')
    } finally {
      setLoading(false)
    }
  }, [api, ready])

  useEffect(() => {
    if (!api || !ready) return
    void reload()
  }, [api, ready, reload])

  return { tickets, loading: loading || !ready, error, reload }
}
