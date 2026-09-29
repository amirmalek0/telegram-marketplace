export function formatPrice(value: number) {
  return `${Math.round(value).toLocaleString('fa-IR')} تومان`
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(value))
  } catch {
    return value
  }
}
