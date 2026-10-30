import type { ImageWidget } from './imageWidgets.ts'

const themes: Record<string, string> = {
  plain: 'border-radius:16px;',
  soft: 'background:var(--accent-soft);padding:12px;border-radius:24px;',
  outlined: 'border-width:1px;padding:8px;border-radius:20px;',
  glass: 'background:color-mix(in srgb,var(--surface-solid) 65%,transparent);backdrop-filter:blur(14px);border-width:1px;padding:12px;border-radius:24px;',
  accent: 'background:var(--accent-soft);border-width:2px;border-color:var(--accent);padding:6px;border-radius:20px;',
}
const shadows: Record<string, string> = { none: 'none', soft: '0 4px 16px #0000000d', lifted: '0 8px 24px #0000001a' }
const cssName = (key: string) => key.replace(/[A-Z]/g, character => '-' + character.toLowerCase())

export function imageWidgetStyles(widget: ImageWidget, theme: string) {
  const styles = widget.styles
  const declarations = Object.entries(styles).filter(([key]) => !['mobileHeight', 'height', 'objectFit', 'alignment', 'maxWidth'].includes(key)).map(([key, value]) => {
    if (key === 'shadow') return 'box-shadow:' + shadows[value]
    const unit = typeof value !== 'number' || key === 'opacity' ? '' : key === 'width' ? '%' : 'px'
    return cssName(key) + ':' + value + unit
  }).join(';')
  return `
    :host { display:block; min-width:0; font-family:inherit; color:var(--text); }
    *,*::before,*::after { box-sizing:border-box; }
    .alignment { display:flex; justify-content:${styles.alignment === 'end' ? 'flex-end' : styles.alignment === 'center' ? 'center' : 'flex-start'}; }
    .widget { margin:0; width:100%; min-width:0; border:0 solid var(--line); overflow:hidden;
      max-width:min(${styles.maxWidth ?? '100%'}${styles.maxWidth != null ? 'px' : ''}, calc(100% - ${styles.marginLeft ?? 0}px - ${styles.marginRight ?? 0}px));
      ${themes[theme] ?? ''} }
    .widget { ${declarations} }
    .image-area { position:relative; overflow:hidden; border-radius:inherit; }
    img { display:block; width:100%; height:${styles.height != null ? styles.height + 'px' : 'auto'}; object-fit:${styles.objectFit ?? 'contain'}; border-radius:inherit; }
    .is-loading img { visibility:hidden; }
    .is-loading .image-area { min-height:${styles.height != null ? styles.height + 'px' : '180px'}; }
    .skeleton { position:absolute; inset:0; border-radius:inherit; background:linear-gradient(110deg,transparent 20%,color-mix(in srgb,var(--surface-solid) 65%,transparent) 45%,transparent 70%),color-mix(in srgb,var(--surface-solid) 35%,transparent); background-size:240% 100%; backdrop-filter:blur(12px); border:1px solid var(--line); animation:image-shimmer 1.8s ease-in-out infinite; }
    .placeholder { display:grid; place-items:center; min-height:140px; padding:20px; border:1px dashed var(--line); border-radius:inherit; color:var(--muted); font-size:13px; text-align:center; overflow-wrap:anywhere; }
    @keyframes image-shimmer { to { background-position:240% 0; } }
    @media(prefers-reduced-motion:reduce) { .skeleton { animation:none; } }
    ${styles.mobileHeight != null ? `@media(max-width:480px) { img { height:${styles.mobileHeight}px; } .is-loading .image-area { min-height:${styles.mobileHeight}px; } }` : ''}
    ${widget.css}
  `
}
