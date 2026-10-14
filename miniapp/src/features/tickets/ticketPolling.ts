import type { TicketWithMessages } from './types'

export const TICKET_POLL_INTERVAL = 5_000

interface TicketPollingOptions {
  fetchTicket: (signal: AbortSignal) => Promise<TicketWithMessages>
  onUpdate: (thread: TicketWithMessages) => void
  onLoading: (loading: boolean) => void
  onLoadError: (error: string | null) => void
}

// One request at a time. Background refreshes never replace the conversation
// with a loader, and stopped/aborted requests cannot update another ticket.
export function startTicketPolling({ fetchTicket, onUpdate, onLoading, onLoadError }: TicketPollingOptions) {
  let request: AbortController | null = null
  let stopped = false
  let paused = false
  let loaded = false

  const refresh = async () => {
    if (stopped || paused || request) return
    const controller = new AbortController()
    request = controller
    if (!loaded) { onLoading(true); onLoadError(null) }
    try {
      const thread = await fetchTicket(controller.signal)
      if (stopped || controller.signal.aborted) return
      if (!loaded) onLoadError(null)
      loaded = true
      onUpdate(thread)
    } catch {
      if (!stopped && !controller.signal.aborted && !loaded) {
        onLoadError('این گفت‌وگو در دسترس نیست یا دریافت آن ناموفق بود.')
      }
    } finally {
      if (request === controller) request = null
      if (!stopped && !controller.signal.aborted) onLoading(false)
    }
  }

  void refresh()
  const timer = setInterval(() => { void refresh() }, TICKET_POLL_INTERVAL)
  return {
    refresh,
    pause() {
      paused = true
      request?.abort()
      request = null
    },
    resume() {
      paused = false
      void refresh()
    },
    stop() {
      stopped = true
      clearInterval(timer)
      request?.abort()
      request = null
    },
  }
}
