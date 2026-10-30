import { customCssError, type TextWidget } from './textWidgets';
import { appearanceCssError } from './widgetAppearance';
import { WidgetCustomizePanel } from './WidgetCustomizePanel';
import { WidgetStyleFields } from './WidgetStyleFields';
export { ColorField, NumberField } from './WidgetFields';

export function TextWidgetEditor({ value, heading, disabled, onChange, appearanceOnly = false }: { value: TextWidget; heading: boolean; disabled: boolean; onChange: (value: TextWidget) => void; appearanceOnly?: boolean }) {
  const content = appearanceOnly ? undefined : <>
    {heading && <div className="widget-heading-level"><span>سطح عنوان</span><div role="group" aria-label="سطح عنوان">{(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const).map(tag => <button type="button" key={tag} aria-pressed={value.tag === tag} onClick={() => onChange({ ...value, tag })}>{tag.toUpperCase()}</button>)}</div></div>}
    <label className="widget-field"><span>{heading ? 'متن عنوان' : 'متن پاراگراف'}<small>{value.content.length.toLocaleString('fa-IR')} / ۴۰۰۰</small></span><textarea rows={heading ? 3 : 6} aria-label={heading ? 'متن عنوان' : 'متن پاراگراف'} maxLength={4000} value={value.content} onChange={event => onChange({ ...value, content: event.target.value })} /></label>
    <p className="widget-help">متن ساده بنویسید؛ خط‌های جدید حفظ می‌شوند و HTML اجرا نمی‌شود.</p>
  </>;
  return <WidgetCustomizePanel content={content} disabled={disabled} count={Object.keys(value.styles).length} design={<WidgetStyleFields styles={value.styles} onChange={styles => onChange({ ...value, styles })} />} css={value.css} cssError={appearanceOnly ? appearanceCssError(value.css) : customCssError(value.css)} onCssChange={css => onChange({ ...value, css })} onReset={() => onChange({ ...value, styles: {}, css: '' })} />;
}
