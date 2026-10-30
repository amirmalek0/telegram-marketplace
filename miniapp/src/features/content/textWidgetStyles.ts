import type { TextWidget } from './textWidgets.ts'

const themes: Record<string, string> = {
  plain: '',
  soft: 'background:var(--accent-soft);padding:20px;border-radius:20px;',
  outlined: 'border-width:1px;border-color:var(--line);padding:20px;border-radius:16px;',
  glass: 'background:color-mix(in srgb,var(--surface-solid) 65%,transparent);backdrop-filter:blur(14px);border-width:1px;border-color:var(--line);padding:20px;border-radius:22px;',
  accent: 'border-inline-start-width:4px;border-color:var(--accent);padding:10px 18px;color:var(--accent);',
}
const shadows: Record<string, string> = { none: 'none', soft: '0 4px 16px #0000000d', lifted: '0 8px 24px #0000001a' }
const defaultSizes = { h1: 32, h2: 26, h3: 22, h4: 20, h5: 18, h6: 16, p: 15 }
const cssName = (key: string) => key.replace(/[A-Z]/g, character => '-' + character.toLowerCase())

export function textWidgetStyles(widget: TextWidget, theme: string) {
  const declarations = Object.entries(widget.styles).filter(([key]) => key !== 'mobileFontSize').map(([key, value]) => {
    if (key === 'shadow') return 'box-shadow:' + shadows[value]
    const unit = typeof value !== 'number' || ['fontWeight', 'lineHeight', 'opacity'].includes(key) ? '' : key === 'width' ? '%' : 'px'
    return cssName(key) + ':' + value + unit
  }).join(';')
  return `
    :host { display:block; min-width:0; font-family:inherit; color:var(--text); }
    *,*::before,*::after { box-sizing:border-box; }
    .widget { margin:0; width:100%; max-width:100%; border:0 solid var(--line); font-family:inherit;
      font-size:${defaultSizes[widget.tag]}px; font-weight:${widget.tag === 'p' ? 400 : 700}; line-height:${widget.tag === 'p' ? 1.9 : 1.55};
      white-space:pre-wrap; overflow-wrap:anywhere; text-align:start; letter-spacing:normal; color:var(--text);
      ${themes[theme] ?? ''} }
    .widget { ${declarations} }
    ${widget.styles.mobileFontSize != null ? `@media(max-width:480px) { .widget { font-size:${widget.styles.mobileFontSize}px; } }` : ''}
    ${widget.css}
  `
}
