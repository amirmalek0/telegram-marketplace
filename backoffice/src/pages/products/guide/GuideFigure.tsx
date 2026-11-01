import { ZoomIn } from 'lucide-react';

export type GuideScreenshot = { name: string; caption: string };
export const guideImageUrl = (name: string) => `/guides/products/${name}.jpg`;

export function GuideFigure({ name, caption, onZoom }: GuideScreenshot & { onZoom: (image: GuideScreenshot) => void }) {
  return <figure className="product-guide-figure">
    <button type="button" onClick={() => onZoom({ name, caption })} aria-label={`بزرگ‌نمایی تصویر: ${caption}`}>
      <img src={guideImageUrl(name)} alt={caption} loading="lazy" decoding="async" />
      <span><ZoomIn size={14} /> بزرگ‌نمایی</span>
    </button><figcaption>{caption}</figcaption>
  </figure>;
}
