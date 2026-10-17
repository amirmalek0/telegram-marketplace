import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';

// Never attach an admin token to an external photo URL.
const storedPhoto = /^\/api\/v1\/user\/[\da-f-]{36}\/photos\/[\da-f-]{36}\/content$/i;
export function useCustomerPhoto(url?: string) {
  const [result, setResult] = useState<{ url: string; src?: string; error?: boolean }>();
  const internal = Boolean(url && storedPhoto.test(url));
  useEffect(() => {
    if (!url || !storedPhoto.test(url)) return;
    const controller = new AbortController();
    let objectURL: string | undefined;
    apiClient.get<Blob>(url.slice('/api/v1'.length), { responseType: 'blob', signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(data.type)) throw new Error('Invalid image');
      objectURL = URL.createObjectURL(data); setResult({ url, src: objectURL });
    }).catch(() => { if (!controller.signal.aborted) setResult({ url, error: true }); });
    return () => { controller.abort(); if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [url]);
  return { src: internal ? (result?.url === url ? result?.src : undefined) : url?.startsWith('https://') ? url : undefined, loading: internal && result?.url !== url, error: internal && result?.url === url && result?.error };
}
