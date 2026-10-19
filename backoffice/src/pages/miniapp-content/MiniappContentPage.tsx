import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { EditorWorkspace } from './EditorWorkspace';
import { useAuthStore } from '@/stores/authStore';
import { EditorControls } from './EditorControls';
import type { LayoutDrafts } from './PageLayoutEditor';
import type { PageId } from './pageLayouts';
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorWindowRef = useRef<Window | null>(null);
  const palettePreviewRef = useRef<{ type: string; palette: Palette | null; mode: PaletteMode } | null>(null);
  const layoutsPreviewRef = useRef<{ type: string; layouts: LayoutDrafts } | null>(null);
  const previewPathRef = useRef('/');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [frameKey, setFrameKey] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);
  const [connectionSlow, setConnectionSlow] = useState(false);
  const [previewPage, setPreviewPage] = useState<PreviewPageState | null>(null);
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
    if (!receiver || !accessToken) return;
    receiver.postMessage({ type: 'miniapp-editor-auth', token: accessToken }, previewURL.origin);
    if (palettePreviewRef.current) receiver.postMessage(palettePreviewRef.current, previewURL.origin);
    if (layoutsPreviewRef.current) receiver.postMessage(layoutsPreviewRef.current, previewURL.origin);
  }, [accessToken, previewURL.origin]);

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
    controls={<EditorControls onPalette={previewPalette} onLayouts={previewLayouts} onOpenPage={openPage} pathname={previewPage?.pathname} />}
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
