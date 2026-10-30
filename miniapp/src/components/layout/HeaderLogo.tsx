import { useState } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import type { CatalogIconName } from '../../features/content/iconCatalog'

export function HeaderLogo({ src, icon }: { src?: string; icon: IconName | CatalogIconName }) {
  const [failed, setFailed] = useState<string>()
  const showLogo = !!src && failed !== src
  return <span className={`header-title-icon chrome-logo ${showLogo ? 'has-shop-logo' : ''}`}>
    {showLogo ? <img src={src} alt="" draggable={false} onError={() => setFailed(src)} /> : <Icon name={icon} size={22} />}
  </span>
}
