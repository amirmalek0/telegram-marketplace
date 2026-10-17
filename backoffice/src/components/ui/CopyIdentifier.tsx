import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { shortId } from '@/utils/format';

async function copyText(value: string) {
  try {
    if (navigator.clipboard) { await navigator.clipboard.writeText(value); return; }
  } catch { /* Use the selection fallback on non-secure or restricted browsers. */ }
  const previous = document.activeElement as HTMLElement | null;
  const field = document.createElement('textarea');
  field.value = value;
  field.style.cssText = 'position:fixed;top:0;left:-9999px;';
  field.readOnly = true;
  document.body.appendChild(field);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('Copy unavailable');
  } finally { field.remove(); previous?.focus(); }
}

export function CopyIdentifier({ value, label = 'شناسه', full = false }: { value: string; label?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await copyText(value); setCopied(true); clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
      toast.success(`${label} کپی شد`, { id: 'copy-identifier' });
    } catch { toast.error('کپی خودکار ممکن نیست؛ شناسه کامل را از راهنمای دکمه بردارید.'); }
  };
  return <button type="button" onClick={copy} title={value} aria-label={`کپی ${label} ${value}`} className="inline-flex items-center gap-2 rounded-lg border border-[rgb(var(--color-border))] px-2.5 py-2 text-[rgb(var(--color-text-secondary))] transition hover:border-blue-500/40 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500">
    <code dir="ltr" className="min-w-0 break-all text-[11px]">{full ? value : shortId(value)}</code>
    {copied ? <Check size={14} aria-hidden="true" className="shrink-0 text-emerald-600" /> : <Copy size={14} aria-hidden="true" className="shrink-0" />}
  </button>;
}
