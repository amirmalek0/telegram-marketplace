import { useEffect, useState } from 'react'
import { ApiClient } from '../../api/client'

const internalPhoto = /^\/api\/v1\/user\/[\da-f-]{36}\/photos\/[\da-f-]{36}\/content$/i
export function useProfilePhoto(url?: string, initDataRaw?: string | null) {
  const [image, setImage] = useState<{ url: string; src: string }>()
  useEffect(() => {
    if (!url || !internalPhoto.test(url) || !initDataRaw) return
    const controller = new AbortController()
    let objectURL: string | undefined
    new ApiClient({ initDataRaw }).photo(url.slice('/api/v1'.length), controller.signal).then(blob => {
      if (controller.signal.aborted) return
      objectURL = URL.createObjectURL(blob); setImage({ url, src: objectURL })
    }).catch(() => {})
    return () => { controller.abort(); if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [url, initDataRaw])
  return url && internalPhoto.test(url) ? image?.url === url ? image.src : undefined : url?.startsWith('https://') ? url : undefined
}
