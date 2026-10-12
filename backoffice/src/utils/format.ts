export const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '—';

export const formatDateTime = (value?: string) => value
  ? new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
  : '—';

export const shortId = (value?: string) => value ? `${value.slice(0, 8)}…` : '—';
