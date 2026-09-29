export function publicAssetURL(value: string) {
  try {
    const url = new URL(value)
    if (url.hostname === 'minio') return `/storage${url.pathname}${url.search}`
  } catch {
    return value
  }

  return value
}
