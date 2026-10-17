import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { publicAssetURL } from '@/utils/assets';

export function CatalogIdentity({ title, subtitle, image, icon: Icon, onClick }: {
  title: string; subtitle?: string; image?: string; icon: LucideIcon; onClick?: () => void;
}) {
  const [failedImage, setFailedImage] = useState<string>();
  const content = <><span className={`catalog-item-icon${image ? ' catalog-item-image' : ''}`}>
    {image && failedImage !== image ? <img src={publicAssetURL(image)} alt="" loading="lazy" onError={() => setFailedImage(image)} /> : <Icon size={20} aria-hidden="true" />}
  </span><span className="catalog-item-text"><b>{title}</b>{subtitle && <small>{subtitle}</small>}</span></>;
  return onClick ? <button type="button" className="catalog-identity catalog-identity-link" onClick={onClick} title={title}>{content}</button> : <div className="catalog-identity">{content}</div>;
}
