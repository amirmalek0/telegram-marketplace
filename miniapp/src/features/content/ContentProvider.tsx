import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ApiClient } from '../../api/client'
import { contentCatalog, type ContentKey } from './contentCatalog'
import { editorScenariosForPath } from './editorScenarios'

interface ContentResponse { data: Record<string, string> }
interface ContentEntry { key: string; value: string }

interface ContentContextValue {
  adminToken: string | null
  editorMode: boolean
  editorReady: boolean
  editorScenario: string
  text: (key: ContentKey) => string
}

const ContentContext = createContext<ContentContextValue>({
  adminToken: null,
  editorMode: false,
  editorReady: true,
  editorScenario: 'content',
  text: (key) => contentCatalog[key],
})

function editorOrigin() {
  const configuredOrigin = new URLSearchParams(window.location.search).get('editor-origin')
  if (configuredOrigin) {
    try { return new URL(configuredOrigin).origin } catch { /* fall back to referrer */ }
  }
  if (!document.referrer) return null
  try { return new URL(document.referrer).origin } catch { return null }
}

function editorHostWindow() {
  if (window.opener && !window.opener.closed) return window.opener as Window
  return window.parent
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function templateMatcher(template: string) {
  const parts = template.split(/\{[^}]+\}/g).map(escapeRegExp)
  return new RegExp(`^${parts.join('(.+?)')}$`)
}

function applyTemplate(template: string, values: string[]) {
  let index = 0
  return template.replace(/\{[^}]+\}/g, () => values[index++] ?? '')
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const editorMode = useMemo(() => new URLSearchParams(window.location.search).get('content-editor') === '1', [])
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<ContentKey | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const scenarioOptions = useMemo(() => editorScenariosForPath(location.pathname), [location.pathname])
  const [editorScenario, setEditorScenario] = useState(scenarioOptions[0].value)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setEditorScenario(scenarioOptions[0].value) }, [location.pathname, scenarioOptions])

  const loadContent = useCallback(async () => {
    try {
      const response = await new ApiClient().get<ContentResponse>('/miniapp-content')
      setOverrides(response.data || {})
    } catch {
      // Frontend defaults are deliberately usable when content delivery is offline.
    }
  }, [])

  useEffect(() => { void loadContent() }, [loadContent])

  useEffect(() => {
    if (!editorMode) return
    const trustedOrigin = editorOrigin()
    const hostWindow = editorHostWindow()
    const receiveToken = (event: MessageEvent) => {
      if (event.source !== hostWindow || (trustedOrigin && event.origin !== trustedOrigin)) return
      if (event.data?.type === 'miniapp-editor-auth' && typeof event.data.token === 'string') {
        setAdminToken(event.data.token)
      }
      if (event.data?.type === 'miniapp-editor-scenario' && typeof event.data.scenario === 'string') {
        const nextScenario = event.data.scenario
        if (scenarioOptions.some((option) => option.value === nextScenario)) setEditorScenario(nextScenario)
      }
      if (event.data?.type === 'miniapp-editor-open-catalog') setCatalogOpen(true)
    }
    window.addEventListener('message', receiveToken)
    hostWindow.postMessage({ type: 'miniapp-editor-ready' }, trustedOrigin || '*')
    return () => window.removeEventListener('message', receiveToken)
  }, [editorMode, scenarioOptions])

  useEffect(() => {
    if (!editorMode) return
    editorHostWindow().postMessage({
      type: 'miniapp-editor-page',
      pathname: location.pathname,
      scenario: editorScenario,
      scenarios: scenarioOptions,
    }, editorOrigin() || '*')
  }, [editorMode, editorScenario, location.pathname, scenarioOptions])

  const text = useCallback((key: ContentKey) => overrides[key] ?? contentCatalog[key], [overrides])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const defaultEntries = Object.entries(contentCatalog) as [ContentKey, string][]
    const knownValues = new Map<string, ContentKey>()
    const templates: Array<{ key: ContentKey; matcher: RegExp; score: number }> = []
    for (const [key, fallback] of defaultEntries) {
      if (fallback.includes('{')) templates.push({ key, matcher: templateMatcher(fallback), score: fallback.replace(/\{[^}]+\}/g, '').length })
      else if (!knownValues.has(fallback)) knownValues.set(fallback, key)
      const current = overrides[key]
      if (current?.includes('{')) templates.push({ key, matcher: templateMatcher(current), score: current.replace(/\{[^}]+\}/g, '').length })
      else if (current !== undefined) knownValues.set(current, key)
    }
    templates.sort((left, right) => right.score - left.score)

    const decorate = () => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode() as Text | null
      while (node) {
        const raw = node.nodeValue || ''
        const value = raw.trim()
        let key = knownValues.get(value)
        let parameters: string[] = []
        if (!key) {
          for (const template of templates) {
            const match = value.match(template.matcher)
            if (match) { key = template.key; parameters = match.slice(1); break }
          }
        }
        const parent = node.parentElement
        if (key && parent && !parent.closest('.content-editor-panel')) {
          const replacement = applyTemplate(text(key), parameters)
          if (value !== replacement) node.nodeValue = raw.replace(value, replacement)
          if (editorMode) parent.dataset.contentKey = key
        }
        node = walker.nextNode() as Text | null
      }
      for (const element of root.querySelectorAll<HTMLElement>('[placeholder],[aria-label],[title]')) {
        for (const attribute of ['placeholder', 'aria-label', 'title']) {
          const value = element.getAttribute(attribute)
          if (!value) continue
          const key = knownValues.get(value)
          if (!key) continue
          element.setAttribute(attribute, text(key))
          if (editorMode) element.dataset.contentKey = key
        }
      }
    }

    decorate()
    const observer = new MutationObserver(decorate)
    observer.observe(root, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [editorMode, overrides, text])

  useEffect(() => {
    if (!editorMode) return
    const selectText = (event: MouseEvent) => {
      const clickedElement = event.target as HTMLElement | null
      const target = clickedElement?.closest<HTMLElement>('[data-content-key]')
      if (!target || target.closest('.content-editor-panel')) return
      // Navigation and controls must remain usable while previewing the real
      // Mini App. Their copy is still editable with Alt+Click or from the full
      // content catalog.
      const interactive = clickedElement?.closest('a, button, input, textarea, select, label, summary')
      if (interactive && !event.altKey) return
      const key = target.dataset.contentKey as ContentKey
      if (!contentCatalog[key]) return
      event.preventDefault()
      event.stopPropagation()
      setActiveKey(key)
      setDraft(text(key))
      setSaveError('')
    }
    document.addEventListener('click', selectText, true)
    return () => document.removeEventListener('click', selectText, true)
  }, [editorMode, text])

  const save = async () => {
    if (!activeKey || !adminToken || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const entry = await new ApiClient({ bearerToken: adminToken }).put<ContentEntry>(
        `/miniapp-content/${encodeURIComponent(activeKey)}`,
        { value: draft },
      )
      setOverrides((current) => ({ ...current, [entry.key]: entry.value }))
      editorHostWindow().postMessage({ type: 'miniapp-content-saved', key: entry.key }, editorOrigin() || '*')
      setActiveKey(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'ذخیره متن ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!activeKey || !adminToken || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await new ApiClient({ bearerToken: adminToken }).delete(`/miniapp-content/${encodeURIComponent(activeKey)}`)
      setOverrides((current) => {
        const next = { ...current }
        delete next[activeKey]
        return next
      })
      setDraft(contentCatalog[activeKey])
      editorHostWindow().postMessage({ type: 'miniapp-content-saved', key: activeKey }, editorOrigin() || '*')
      setActiveKey(null)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'بازگردانی متن ناموفق بود')
    } finally {
      setSaving(false)
    }
  }

  const value = useMemo<ContentContextValue>(() => ({
    adminToken,
    editorMode,
    editorReady: !editorMode || Boolean(adminToken),
    editorScenario,
    text,
  }), [adminToken, editorMode, editorScenario, text])

  const visibleCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('fa')
    const entries = Object.entries(contentCatalog) as [ContentKey, string][]
    if (!query) return entries
    return entries.filter(([key]) => `${key} ${text(key)}`.toLocaleLowerCase('fa').includes(query))
  }, [catalogQuery, text])

  const editKey = (key: ContentKey) => {
    setCatalogOpen(false)
    setActiveKey(key)
    setDraft(text(key))
    setSaveError('')
  }

  return (
    <ContentContext.Provider value={value}>
      <div ref={rootRef} className={editorMode ? 'content-editor-mode' : undefined}>{children}</div>
      {editorMode && catalogOpen && (
        <div className="content-editor-backdrop content-catalog-backdrop" onMouseDown={() => setCatalogOpen(false)}>
          <section className="content-editor-panel content-catalog-panel" dir="rtl" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') setCatalogOpen(false) }}>
            <header><div><small>محتوای مینی‌اپ</small><strong>{visibleCatalog.length.toLocaleString('fa-IR')} متن</strong></div><button onClick={() => setCatalogOpen(false)} aria-label="بستن">×</button></header>
            <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="جست‌وجو در متن یا کلید…" />
            <div className="content-catalog-list">
              {visibleCatalog.map(([key]) => (
                <button type="button" key={key} onClick={() => editKey(key)}>
                  <span>{text(key)}</span><code>{key}</code>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {editorMode && activeKey && (
        <div className="content-editor-backdrop" onMouseDown={() => !saving && setActiveKey(null)}>
          <section className="content-editor-panel" dir="rtl" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => {
            if (event.key === 'Escape' && !saving) setActiveKey(null)
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save() }
          }}>
            <header><div><small>ویرایش متن</small><strong>{activeKey}</strong></div><button onClick={() => setActiveKey(null)} aria-label="بستن">×</button></header>
            <textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} />
            <div className="content-editor-template-hint">عبارت‌های داخل آکولاد مثل <code>{'{count}'}</code> مقدار زنده هستند؛ برای حفظ مقدار آن‌ها را حذف نکنید.</div>
            <div className="content-editor-meta"><span>{draft.length.toLocaleString('fa-IR')} / ۴۰۰۰</span>{saveError && <b>{saveError}</b>}</div>
            <footer><button className="editor-reset" disabled={saving || overrides[activeKey] === undefined} onClick={() => void reset()}>متن پیش‌فرض</button><button className="editor-cancel" disabled={saving} onClick={() => setActiveKey(null)}>انصراف</button><button className="editor-save" disabled={saving || !adminToken} onClick={() => void save()}>{saving ? 'در حال ذخیره…' : 'ذخیره متن'}</button></footer>
          </section>
        </div>
      )}
    </ContentContext.Provider>
  )
}

export function useContent() { return useContext(ContentContext) }
