import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiClient } from '../../api/client'

export interface Notification {
  id: string
  title: string
  message: string
  published_at: string
  action_path?: string
  read_at?: string
}
interface Inbox { data: Notification[]; total_pages: number; unread_count: number }

export function useNotifications(initDataRaw: string | null, inboxOpen: boolean, preview: boolean) {
  const api = useMemo(() => new ApiClient({ initDataRaw: initDataRaw || undefined }), [initDataRaw])
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [actionError, setActionError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const actionLock = useRef(false)
  const refresh = () => setRevision(v => v + 1)

  useEffect(() => {
    if (preview || !initDataRaw) return
    const timer = window.setInterval(() => { if (!document.hidden) refresh() }, 30000)
    const visible = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [preview, initDataRaw])

  useEffect(() => {
    if (preview || !initDataRaw) return
    const controller = new AbortController()
    setLoading(true); setError(false)
    async function load() {
      try {
        if (inboxOpen) {
          const data = await api.get<Inbox>(`/notification?page=${page}&per_page=20`, controller.signal)
          if (!controller.signal.aborted) {
            setItems(data.data || []); setPages(Math.max(1, data.total_pages)); setUnread(data.unread_count)
            if (page > Math.max(1, data.total_pages)) setPage(Math.max(1, data.total_pages))
          }
        } else {
          const data = await api.get<{ unread_count: number }>('/notification/unread-count', controller.signal)
          if (!controller.signal.aborted) setUnread(data.unread_count)
        }
      } catch { if (!controller.signal.aborted) setError(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [api, initDataRaw, inboxOpen, page, preview, revision])

  async function markRead(id?: string) {
    if (preview || !initDataRaw || actionLock.current) return
    actionLock.current = true; setBusy(true); setActionError(false)
    try {
      await api.post(id ? `/notification/${id}/read` : '/notification/read-all')
      setItems(current => current.map(item => !id || item.id === id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item))
      refresh()
    } catch { setActionError(true) }
    finally { actionLock.current = false; setBusy(false) }
  }

  return { items, unread, page, pages, loading, error, actionError, busy, refresh, markRead, setPage }
}

export type NotificationsState = ReturnType<typeof useNotifications>
