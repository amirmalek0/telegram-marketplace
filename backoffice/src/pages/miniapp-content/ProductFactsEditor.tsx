import { defaultProductFactIcons, productFactFields, showProductFact, type ProductFactIcons, type ProductFactsVisibility } from './productFacts';
import { IconPicker } from './IconPicker';
import './product-facts-editor.css';

export function ProductFactsEditor({ value, icons, disabled, onChange, onIconsChange }: {
  value?: ProductFactsVisibility; icons?: ProductFactIcons; disabled: boolean;
  onChange: (value: ProductFactsVisibility) => void; onIconsChange: (value: ProductFactIcons) => void;
}) {
  return <fieldset className="product-facts-editor" disabled={disabled}>
    <legend>نمایش اطلاعات محصول</legend>
    <p>نمایش و آیکون هر مورد را انتخاب کنید. بازنشانی، آیکون متناسب با محصول را برمی‌گرداند.</p>
    <div>{(Object.keys(productFactFields) as (keyof typeof productFactFields)[]).map(field =>
      <div className="product-fact-setting" key={field}>
        <label className="product-fact-toggle"><span>{productFactFields[field]}</span>
          <input type="checkbox" role="switch" checked={showProductFact(value, field)} onChange={event => onChange({ ...value, [field]: event.target.checked })} />
        </label>
        <IconPicker value={icons?.[field] ?? defaultProductFactIcons[field]} label={'آیکون ' + productFactFields[field]} fieldTitle="" disabled={disabled}
          onChange={icon => onIconsChange({ ...icons, [field]: icon })}
          onReset={icons?.[field] ? () => { const next = { ...icons }; delete next[field]; onIconsChange(next); } : undefined} />
      </div>)}</div>
    <small>اگر همه گزینه‌ها خاموش باشند، این بخش پنهان می‌شود. لینک نمایشی فقط برای محصول دارای لینک نمایش داده می‌شود.</small>
  </fieldset>;
}
