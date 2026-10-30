import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { EditorWorkspace } from './EditorWorkspace';
import { useAuthStore } from '@/stores/authStore';
import { EditorControls } from './EditorControls';
import type { LayoutDrafts, WidgetSelection } from './PageLayoutEditor';
import { pageIds, type PageId } from './pageLayouts';
import { widgetIdPattern } from './textWidgets';
import type { HeaderSettings } from './headerSettings';
import type { GlobalWidgets } from './globalWidgets';
import type { NavigationSettings } from './navigationSettings';
import type { Palette, PaletteMode } from './palette';

function editorURL() {
  const configured = import.meta.env.VITE_MINIAPP_URL || 'http://localhost:3000';
  const url = new URL(configured, window.location.origin);
  url.searchParams.set('content-editor', '1');
  url.searchParams.set('editor-origin', window.location.origin);
  return url;
}

interface PreviewScenario {
  value: string;
  label: string;
}

interface PreviewPageState {
  pathname: string;
  scenario: string;
  scenarios: PreviewScenario[];
}

export default function MiniappContentPage() {
  const refreshingPreviewAuth = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorWindowRef = useRef<Window | null>(null);
  const palettePreviewRef = useRef<{ type: string; palette: Palette | null; mode: PaletteMode } | null>(null);
  const layoutsPreviewRef = useRef<{ type: string; layouts: LayoutDrafts } | null>(null);
  const headerPreviewRef = useRef<{ type: string; settings: HeaderSettings } | null>(null);
  const globalsPreviewRef = useRef<{ type: string; widgets: GlobalWidgets } | null>(null);
  const navigationPreviewRef = useRef<{ type: string; settings: NavigationSettings } | null>(null);
  const previewPathRef = useRef('/');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [frameKey, setFrameKey] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  const [previewPage, setPreviewPage] = useState<PreviewPageState | null>(null);
  const [selection, setSelection] = useState<WidgetSelection>();
  const previewURL = useMemo(() => {
    const url = editorURL();
    url.pathname = previewPathRef.current;
    url.searchParams.set('preview-reload', String(frameKey));
    return url;
  }, [frameKey]);

  useEffect(() => {
    setConnectionSlow(false);
    if (connected) return;
    const timer = window.setTimeout(() => setConnectionSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [connected, frameKey]);

  const sendCredentials = useCallback((target?: Window | null) => {
    const receiver = target || iframeRef.current?.contentWindow;
    const currentToken = useAuthStore.getState().accessToken;
    if (!receiver || !currentToken) return;
    receiver.postMessage({ type: 'miniapp-editor-auth', token: currentToken }, previewURL.origin);
    if (palettePreviewRef.current) receiver.postMessage(palettePreviewRef.current, previewURL.origin);
    if (layoutsPreviewRef.current) receiver.postMessage(layoutsPreviewRef.current, previewURL.origin);
    if (headerPreviewRef.current) receiver.postMessage(headerPreviewRef.current, previewURL.origin);
    if (globalsPreviewRef.current) receiver.postMessage(globalsPreviewRef.current, previewURL.origin);
    if (navigationPreviewRef.current) receiver.postMessage(navigationPreviewRef.current, previewURL.origin);
  }, [accessToken, previewURL.origin]);

  useEffect(() => {
    sendCredentials();
    if (editorWindowRef.current && !editorWindowRef.current.closed) sendCredentials(editorWindowRef.current);
  }, [sendCredentials]);

  const previewPalette = useCallback((palette: Palette | null, mode: PaletteMode) => {
    const message = { type: 'miniapp-editor-palette', palette, mode };
    palettePreviewRef.current = message;
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);

  const previewLayouts = useCallback((layouts: LayoutDrafts) => {
    const message = { type: 'miniapp-editor-page-layouts', layouts };
    layoutsPreviewRef.current = message;
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);

  const previewHeader = useCallback((settings: HeaderSettings) => {
    const message = { type: 'miniapp-editor-header', settings };
    headerPreviewRef.current = message;
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);

  const previewGlobals = useCallback((widgets: GlobalWidgets) => {
    const message = { type: 'miniapp-editor-global-widgets', widgets };
    globalsPreviewRef.current = message;
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);
  const previewNavigation = useCallback((settings: NavigationSettings) => {
    const message = { type: 'miniapp-editor-navigation', settings };
    navigationPreviewRef.current = message;
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);

  const openPage = useCallback((page: PageId) => {
    const message = { type: 'miniapp-editor-navigate-page', page };
    iframeRef.current?.contentWindow?.postMessage(message, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) editorWindowRef.current.postMessage(message, previewURL.origin);
  }, [previewURL.origin]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const fromFrame = event.source === iframeRef.current?.contentWindow;
      const fromEditorWindow = event.source === editorWindowRef.current;
      if (event.origin !== previewURL.origin || (!fromFrame && !fromEditorWindow)) return;
      if (event.data?.type === 'miniapp-editor-widget-selected' && typeof event.data.id === 'string' && widgetIdPattern.test(event.data.id) && pageIds.includes(event.data.page)) {
        setSelection({ id: event.data.id, page: event.data.page, request: Date.now() });
      }
      if (event.data?.type === 'miniapp-editor-auth-required' && !refreshingPreviewAuth.current) {
        refreshingPreviewAuth.current = true;
        // Reuse the dashboard's normal refresh/session-expiry handling.
        void apiClient.get('/payment/methods/config').then(() => sendCredentials(event.source as Window))
          .catch(() => { toast.error('نشست مدیریت معتبر نیست؛ دوباره وارد شوید.'); })
          .finally(() => { refreshingPreviewAuth.current = false; });
      }
      if (event.data?.type === 'miniapp-editor-ready') {
        sendCredentials(event.source as Window);
        if (fromFrame) setConnected(true);
      }
      if (event.data?.type === 'miniapp-content-saved') {
        toast.success('متن مینی‌اپ ذخیره شد');
      }
      if (fromFrame && event.data?.type === 'miniapp-editor-page' && Array.isArray(event.data.scenarios)) {
        const scenarios = event.data.scenarios.filter((item: unknown): item is PreviewScenario => {
          if (!item || typeof item !== 'object') return false;
          const candidate = item as Partial<PreviewScenario>;
          return typeof candidate.value === 'string' && typeof candidate.label === 'string';
        });
        if (typeof event.data.pathname === 'string' && typeof event.data.scenario === 'string' && scenarios.length > 0) {
          if (event.data.pathname.startsWith('/') && !event.data.pathname.startsWith('//')) previewPathRef.current = event.data.pathname;
          setPreviewPage({ pathname: event.data.pathname, scenario: event.data.scenario, scenarios });
        }
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [previewURL.origin, sendCredentials]);

  const reload = () => {
    setConnected(false);
    setPreviewPage(null);
    setFrameKey((value) => value + 1);
  };

  const selectScenario = (scenario: string) => {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    setPreviewPage((current) => current ? { ...current, scenario } : current);
    frame.postMessage({ type: 'miniapp-editor-scenario', scenario }, previewURL.origin);
    if (editorWindowRef.current && !editorWindowRef.current.closed) {
      editorWindowRef.current.postMessage({ type: 'miniapp-editor-scenario', scenario }, previewURL.origin);
    }
  };

  const openCatalog = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'miniapp-editor-open-catalog' }, previewURL.origin);
  };

  const openEditorWindow = () => {
    const url = new URL(previewURL);
    url.pathname = previewPathRef.current;
    const editorWindow = window.open(url.toString(), 'miniapp-content-editor');
    if (!editorWindow) {
      toast.error('مرورگر اجازه باز کردن پنجره جدید را نداد');
      return;
    }
    editorWindowRef.current = editorWindow;
    editorWindow.focus();
  };

  return <EditorWorkspace
    connected={connected}
    connectionSlow={connectionSlow}
    page={previewPage}
    onScenario={selectScenario}
    onReload={reload}
    onOpen={openEditorWindow}
    onCatalog={openCatalog}
    controls={<EditorControls onNavigation={previewNavigation} onGlobals={previewGlobals} onHeader={previewHeader} onPalette={previewPalette} onLayouts={previewLayouts} onOpenPage={openPage} pathname={previewPage?.pathname} selection={selection} />}
  >
    <iframe
      key={frameKey}
      ref={iframeRef}
      title="پیش‌نمایش زنده مینی‌اپ"
      src={previewURL.toString()}
      onLoad={() => sendCredentials()}
      allow="clipboard-read; clipboard-write"
    />
  </EditorWorkspace>;
}
