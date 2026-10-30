export type WidgetStyles = Record<string, string | number>;
export const paddingKeys = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
export const borderKeys = ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
export const radiusKeys = ['borderTopRightRadius', 'borderTopLeftRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];
export function updateStyleGroup(styles: WidgetStyles, keys: readonly string[], value?: string | number): WidgetStyles {
  const next = { ...styles };
  for (const key of keys) {
    if (value === undefined) delete next[key]; else next[key] = value;
  }
  return next;
}
