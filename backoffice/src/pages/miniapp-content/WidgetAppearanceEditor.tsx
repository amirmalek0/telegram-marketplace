import { TextWidgetEditor } from './TextWidgetEditor';
import { type WidgetAppearance } from './widgetAppearance';
export function WidgetAppearanceEditor({ value, disabled, onChange }: { value?: WidgetAppearance; disabled: boolean; onChange: (value?: WidgetAppearance) => void }) {
  const appearance = value ?? { styles: {}, css: '' };
  return <div className="shared-appearance-editor">
    <TextWidgetEditor appearanceOnly heading={false} disabled={disabled} value={{ tag: 'p', content: '', ...appearance }} onChange={({ styles, css }) => onChange(Object.keys(styles).length || css ? { styles, css } : undefined)} />
  </div>;
}
