import type { ReactNode } from 'react'

export type IconName =
  | 'shop'
  | 'star'
  | 'orders'
  | 'download'
  | 'tickets'
  | 'profile'
  | 'search'
  | 'back'
  | 'eye'
  | 'crown'
  | 'box'
  | 'arrow'
  | 'sun'
  | 'moon'
  | 'sparkles'
  | 'plus'
  | 'send'
  | 'clock'
  | 'check'
  | 'refresh'
  | 'wallet'
  | 'file'
  | 'info'
  | 'alert'
  | 'phone'

const iconPaths: Record<IconName, ReactNode> = {
  star: <path d="m12 2.5 2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55-4.76-4.64 6.58-.96L12 2.5Z" fill="currentColor" stroke="none" />,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4M11 18h2"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
  shop: <><path d="M6.5 8.5V6a5.5 5.5 0 0 1 11 0v2.5"/><path d="M4 8.5h16l-1 12H5l-1-12Z"/></>,
  orders: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></>,
  download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
  tickets: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4.5a2.5 2.5 0 0 1-1-2v-9Z"/><path d="M8 8h8M8 12h5"/></>,
  profile: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  back: <path d="m15 18-6-6 6-6"/>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z"/><path d="M5 21h14"/></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="m4 7 0 10 8 4 8-4V7M12 11v10"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  moon: <path d="M20.5 14.2A8.2 8.2 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2.6L20 9M4 15l2.4 2.6A7 7 0 0 0 17.9 15"/></>,
  wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z"/><path d="M4 7h15M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z"/></>,
  file: <><path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v5h5M10 13h5M10 17h5"/></>,
}

interface IconProps {
  name: IconName
  size?: number
}

export function Icon({ name, size = 22 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  )
}
