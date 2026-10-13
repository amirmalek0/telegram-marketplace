import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink, Keyboard, ListFilter, RefreshCw, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, PageHeader } from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';

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
  const accessToken = useAuthStore((state) => state.accessToken);
  const [frameKey, setFrameKey] = useState(0);
  const [connected, setConnected] = useState(false);
  const [previewPage, setPreviewPage] = useState<PreviewPageState | null>(null);
  const previewURL = useMemo(() => {
    const url = editorURL();
    url.searchParams.set('preview-reload', String(frameKey));
    return url;
  }, [frameKey]);

  const sendCredentials = useCallback((target?: Window | null) => {
    const receiver = target || iframeRef.current?.contentWindow;
    if (!receiver || !accessToken) return;
    receiver.postMessage({ type: 'miniapp-editor-auth', token: accessToken }, previewURL.origin);
  }, [accessToken, previewURL.origin]);

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
    const editorWindow = window.open(previewURL.toString(), 'miniapp-content-editor');
    if (!editorWindow) {
      toast.error('مرورگر اجازه باز کردن پنجره جدید را نداد');
      return;
    }
    editorWindowRef.current = editorWindow;
    editorWindow.focus();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="ویرایش زنده مینی‌اپ"
        action={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<RefreshCw size={15} />} onClick={reload}>بارگذاری مجدد</Button>
            <Button variant="secondary" size="sm" icon={<ExternalLink size={15} />} onClick={openEditorWindow}>باز کردن</Button>
          </div>
        )}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(260px,340px)_minmax(420px,1fr)]">
        <aside className="space-y-4">
          <div className="surface-card space-y-4 p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><ListFilter size={17} /></span>
                <div><b className="text-xs">حالت صفحه</b><p className="mt-1 text-[10px] text-[rgb(var(--color-text-secondary))]">تمام حالت‌های همین صفحه را بررسی کنید</p></div>
              </div>
            </div>
            <select
              value={previewPage?.scenario || ''}
              disabled={!connected || !previewPage}
              onChange={(event) => selectScenario(event.target.value)}
              className="h-11 w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 text-xs font-bold text-[rgb(var(--color-text))] outline-none transition focus:border-violet-500 disabled:opacity-50"
            >
              {!previewPage && <option value="">در حال دریافت حالت‌ها…</option>}
              {previewPage?.scenarios.map((scenario) => <option value={scenario.value} key={scenario.value}>{scenario.label}</option>)}
            </select>
            <button
              type="button"
              disabled={!connected}
              onClick={openCatalog}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-500/10 text-xs font-extrabold text-violet-600 transition hover:bg-violet-500/15 disabled:opacity-50 dark:text-violet-400"
            >
              <Type size={16} /> همه متن‌ها
            </button>
          </div>

          <details className="surface-card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/10 text-sky-500"><BookOpen size={16} /></span>
                <div><h3 className="text-xs font-extrabold">راهنمای ویرایش</h3><p className="mt-0.5 text-[9px] text-[rgb(var(--color-text-secondary))]">روش ویرایش و میانبرها</p></div>
              </div>
              <ChevronDown size={17} className="text-[rgb(var(--color-text-secondary))] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="border-t border-[rgb(var(--color-border))]">
              <div className="space-y-3 p-4 text-[11px] leading-6 text-[rgb(var(--color-text-secondary))]">
                <p><b className="text-[rgb(var(--color-text))]">۱. حرکت بین صفحه‌ها:</b> روی لینک‌ها و نوار پایین پیش‌نمایش کلیک کنید.</p>
                <p><b className="text-[rgb(var(--color-text))]">۲. ویرایش متن معمولی:</b> روی متن خط‌چین‌دار کلیک کنید.</p>
                <p><b className="text-[rgb(var(--color-text))]">۳. متن دکمه یا لینک:</b> با میانبر کلیک کنید تا عملکرد اصلی آن اجرا نشود.</p>
                <p><b className="text-[rgb(var(--color-text))]">۴. حالت صفحه:</b> حالت‌های پر، خالی، خطا و سایر وضعیت‌ها را از انتخاب‌گر بالا ببینید.</p>
                <p><b className="text-[rgb(var(--color-text))]">۵. همه متن‌ها:</b> متن‌های پنهان یا مربوط به حالت‌های دیگر را جست‌وجو و ویرایش کنید.</p>
                <p><b className="text-[rgb(var(--color-text))]">۶. بازیابی و نمایش:</b> «متن پیش‌فرض» تغییر را حذف می‌کند؛ «بارگذاری مجدد» پیش‌نمایش را تازه و «باز کردن» آن را در تب جدا نمایش می‌دهد.</p>
              </div>
              <div className="border-t border-[rgb(var(--color-border))] bg-slate-500/[0.035] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-extrabold"><Keyboard size={16} className="text-violet-500" /> میانبرها</div>
                <div className="grid gap-3 text-[10px] sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <div className="rounded-xl border border-[rgb(var(--color-border))] p-3"><b className="block text-[11px]">macOS</b><p className="mt-2"><kbd>⌥</kbd> + کلیک: ویرایش لینک/دکمه</p><p><kbd>⌘</kbd> + <kbd>Enter</kbd>: ذخیره</p><p><kbd>Esc</kbd>: بستن</p></div>
                  <div className="rounded-xl border border-[rgb(var(--color-border))] p-3"><b className="block text-[11px]">Windows / Linux</b><p className="mt-2"><kbd>Alt</kbd> + کلیک: ویرایش لینک/دکمه</p><p><kbd>Ctrl</kbd> + <kbd>Enter</kbd>: ذخیره</p><p><kbd>Esc</kbd>: بستن</p></div>
                </div>
              </div>
            </div>
          </details>
        </aside>

        <div className="surface-card min-h-[760px] overflow-hidden p-3 sm:p-5">
          <div className="mx-auto overflow-hidden rounded-[34px] border-[7px] border-slate-900 bg-slate-900 shadow-2xl dark:border-slate-700" style={{ width: 'min(100%, 430px)' }}>
            <div className="flex h-7 items-center justify-center bg-slate-900 dark:bg-slate-700"><span className="h-1.5 w-20 rounded-full bg-white/20" /></div>
            <iframe
              key={frameKey}
              ref={iframeRef}
              title="پیش‌نمایش زنده مینی‌اپ"
              src={previewURL.toString()}
              className="block h-[700px] w-full border-0 bg-white"
              onLoad={() => sendCredentials()}
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
