// Shared widget contract; both frontend builds are checked for parity by tests.
export const textWidgetTypes = ['text.heading', 'text.paragraph'] as const;
export const textThemes = ['plain', 'soft', 'outlined', 'glass', 'accent'] as const;
export const textThemeLabels: Record<string, string> = { plain: 'ساده', soft: 'ملایم', outlined: 'قاب‌دار', glass: 'شیشه‌ای', accent: 'تأکیدی' };
export const numericStyleRules: Record<string, readonly [number, number]> = {
  fontSize: [10, 120], mobileFontSize: [10, 80], fontWeight: [100, 900], lineHeight: [.8, 3], letterSpacing: [-2, 10],
  paddingTop: [0, 120], paddingRight: [0, 120], paddingBottom: [0, 120], paddingLeft: [0, 120],
  marginTop: [0, 120], marginBottom: [0, 120],
  borderTopWidth: [0, 16], borderRightWidth: [0, 16], borderBottomWidth: [0, 16], borderLeftWidth: [0, 16],
  borderTopLeftRadius: [0, 100], borderTopRightRadius: [0, 100], borderBottomLeftRadius: [0, 100], borderBottomRightRadius: [0, 100],
  width: [20, 100], maxWidth: [160, 1600], opacity: [0, 1],
};
export const enumStyleRules: Record<string, readonly string[]> = {
  textAlign: ['start', 'center', 'end', 'justify'], direction: ['rtl', 'ltr'],
  fontFamily: ['inherit', 'sans-serif', 'serif', 'monospace'],
  borderStyle: ['solid', 'dashed', 'dotted', 'double'], shadow: ['none', 'soft', 'lifted'],
  textDecoration: ['none', 'underline', 'line-through'],
};
export const colorStyleKeys = ['color', 'backgroundColor', 'borderColor'] as const;
export interface TextWidget {
  tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  content: string;
  styles: Record<string, string | number>;
  css: string;
}
export const isTextWidgetType = (type: string) => (textWidgetTypes as readonly string[]).includes(type);
export const widgetIdPattern = /^widget-[a-zA-Z0-9-]{8,64}$/;
export const maxLayoutBytes = 262144;
export function customCssError(css: string): string | null {
  if ([...css].length > 4000) return 'CSS حداکثر ۴۰۰۰ نویسه مجاز است.';
  // CSS is rendered in a shadow root, never in the document. Disallow external
  // resources and escape-obfuscated tokens; this is styling, not an asset loader.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[\\\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(clean) ||
    /url\s*\(|(?:image-set|image|src|expression)\s*\(|(?:https?|data|javascript):|@(?!(?:media|supports|container|keyframes|layer|starting-style)\b)/i.test(clean)) {
    return 'CSS فقط برای همین ویجت است؛ آدرس خارجی، import و کد اجرایی مجاز نیست.';
  }
  return null;
}
export function validTextWidget(value: unknown, type: string): value is TextWidget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as TextWidget;
  if (Object.keys(item).length !== 4 || !['tag', 'content', 'styles', 'css'].every(key => Object.prototype.hasOwnProperty.call(item, key))) return false;
  if (typeof item.tag !== 'string' || !(type === 'text.heading' ? /^h[1-6]$/ : /^p$/).test(item.tag) || typeof item.content !== 'string' ||
    [...item.content].length > 4000 || typeof item.css !== 'string' || customCssError(item.css)) return false;
  if (!item.styles || typeof item.styles !== 'object' || Array.isArray(item.styles)) return false;
  return Object.entries(item.styles).every(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(numericStyleRules, key)) {
      const [min, max] = numericStyleRules[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    }
    if (Object.prototype.hasOwnProperty.call(enumStyleRules, key)) return typeof value === 'string' && enumStyleRules[key].includes(value);
    return (colorStyleKeys as readonly string[]).includes(key) && typeof value === 'string' && /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$/.test(value);
  });
}
export function newTextWidget(type: string): { id: string; type: string; visible: boolean; design: string; text: TextWidget } {
  return { id: 'widget-' + crypto.randomUUID(), type, visible: true, design: 'plain',
    text: { tag: type === 'text.heading' ? 'h2' : 'p', content: type === 'text.heading' ? 'عنوان دلخواه شما' : 'متن دلخواه خود را اینجا بنویسید.', styles: {}, css: '' } };
}
