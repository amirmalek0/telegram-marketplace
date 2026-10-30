import { validTextWidget, customCssError, type TextWidget } from './textWidgets.ts';
export interface WidgetAppearance { styles: TextWidget['styles']; css: string }
export function appearanceCssError(css: string): string | null {
  return customCssError(css) || (/@(?!(?:media|supports)\b)/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')) ? 'در CSS ویجت آماده فقط media و supports مجاز هستند.' : null);
}
export function validWidgetAppearance(value: unknown): value is WidgetAppearance {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2) return false;
  const item = value as WidgetAppearance;
  return validTextWidget({ tag: 'p', content: '', styles: item.styles, css: item.css }, 'text.paragraph') && !appearanceCssError(item.css);
}
