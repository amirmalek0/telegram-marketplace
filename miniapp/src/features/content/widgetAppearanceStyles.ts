import { appearanceCssError, type WidgetAppearance } from './widgetAppearance'
const cssName = (key: string) => key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())
const shadows: Record<string,string> = { none: 'none', soft: '0 4px 16px #0000000d', lifted: '0 8px 24px #0000001a' }

// Parse first, then scope every selector, including the wrapper itself. Only
// media/supports grouping survives; imports, keyframes and global rules do not.
export function scopedWidgetCSS(css: string, scope: string): string {
  if (!css || appearanceCssError(css)) return ''
  try {
    const sheet = new CSSStyleSheet(); sheet.replaceSync(css)
    const rules = (list: CSSRuleList): string => Array.from(list).map(rule => {
      if (rule instanceof CSSStyleRule) return `${scope}:is(${rule.selectorText}),${scope} :is(${rule.selectorText}){${rule.style.cssText}}`
      if (rule instanceof CSSMediaRule) return `@media ${rule.conditionText}{${rules(rule.cssRules)}}`
      if (rule instanceof CSSSupportsRule) return `@supports ${rule.conditionText}{${rules(rule.cssRules)}}`
      return ''
    }).join('\n')
    return rules(sheet.cssRules)
  } catch { return '' }
}
export function widgetAppearanceStyles(value: WidgetAppearance, scope: string): string {
  const declarations = Object.entries(value.styles).filter(([key]) => key !== 'mobileFontSize').map(([key, value]) => {
    if (key === 'shadow') return 'box-shadow:' + shadows[value]
    const unit = typeof value !== 'number' || ['fontWeight','lineHeight','opacity'].includes(key) ? '' : key === 'width' ? '%' : 'px'
    return cssName(key) + ':' + value + unit
  }).join(';')
  const typography = ['fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','textAlign','color'].filter(key => value.styles[key] != null).map(key => cssName(key) + ':inherit').join(';')
  return `${scope}{min-width:0;max-width:100%;box-sizing:border-box;border:0 solid var(--line);${declarations}}
    ${typography ? `${scope} :is(h1,h2,h3,h4,h5,h6,p,small,span,button,a,input,select,textarea,label){${typography}}` : ''}
    ${value.styles.mobileFontSize != null ? `@media(max-width:480px){${scope}{font-size:${value.styles.mobileFontSize}px}${scope} :is(h1,h2,h3,h4,h5,h6,p,small,span,button,a,input,select,textarea,label){font-size:inherit}}` : ''}
    ${scopedWidgetCSS(value.css,scope)}`
}
