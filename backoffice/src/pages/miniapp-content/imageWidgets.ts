// Shared image-widget contract; keep both frontend copies identical.
import { customCssError, numericStyleRules, widgetIdPattern } from './textWidgets.ts';
export const imageWidgetType = 'media.image';
export const imageThemes = ['plain', 'soft', 'outlined', 'glass', 'accent'] as const;
export const imagePathPattern = /^\/api\/v1\/miniapp-images\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/;
export const imageNumberRules: Record<string, readonly [number, number]> = {
  ...Object.fromEntries(Object.entries(numericStyleRules).filter(([key]) => /^(padding|margin|border)/.test(key) || ['width', 'maxWidth', 'opacity'].includes(key))),
  height: [24, 1200], mobileHeight: [24, 800], marginLeft: [0, 120], marginRight: [0, 120],
};
export const imageEnumRules: Record<string, readonly string[]> = {
  objectFit: ['contain', 'cover'], alignment: ['start', 'center', 'end'],
  borderStyle: ['solid', 'dashed', 'dotted', 'double'], shadow: ['none', 'soft', 'lifted'],
};
export interface ImageWidget { src: string; alt: string; styles: Record<string, string | number>; css: string }
export function validImageWidget(value: unknown): value is ImageWidget {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const image = value as ImageWidget;
  if (Object.keys(image).length !== 4 || !['src', 'alt', 'styles', 'css'].every(key => Object.prototype.hasOwnProperty.call(image, key)) ||
    typeof image.src !== 'string' || (image.src !== '' && !imagePathPattern.test(image.src)) ||
    typeof image.alt !== 'string' || [...image.alt].length > 500 || typeof image.css !== 'string' || customCssError(image.css) ||
    !image.styles || typeof image.styles !== 'object' || Array.isArray(image.styles)) return false;
  return Object.entries(image.styles).every(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(imageNumberRules, key)) {
      const [min, max] = imageNumberRules[key];
      return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    }
    if (Object.prototype.hasOwnProperty.call(imageEnumRules, key)) return typeof value === 'string' && imageEnumRules[key].includes(value);
    return ['backgroundColor', 'borderColor'].includes(key) && typeof value === 'string' && /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$/.test(value);
  });
}
export function newImageWidget() {
  return { id: 'widget-' + crypto.randomUUID(), type: imageWidgetType, visible: true, design: 'plain',
    image: { src: '', alt: '', styles: {}, css: '' } as ImageWidget };
}
export const validImageWidgetId = (id: unknown) => typeof id === 'string' && widgetIdPattern.test(id);
