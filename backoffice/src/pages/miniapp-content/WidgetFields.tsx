import { useEffect, useId, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { numericStyleRules } from './textWidgets';
import './text-widget-editor.css';

const labels: Record<string, string> = {
  fontSize: 'اندازه متن (px)', mobileFontSize: 'اندازه در موبایل (px)', fontWeight: 'وزن قلم', lineHeight: 'فاصله خطوط', letterSpacing: 'فاصله حروف (px)',
  textAlign: 'تراز متن', direction: 'جهت متن', fontFamily: 'خانواده قلم', textDecoration: 'تزئین متن',
  color: 'رنگ متن', backgroundColor: 'رنگ پس‌زمینه', borderColor: 'رنگ کادر', borderStyle: 'نوع کادر', shadow: 'سایه', opacity: 'شفافیت',
  width: 'عرض (%)', maxWidth: 'حداکثر عرض (px)', marginTop: 'فاصله بیرونی بالا', marginBottom: 'فاصله بیرونی پایین',
  paddingTop: 'بالا', paddingRight: 'راست', paddingBottom: 'پایین', paddingLeft: 'چپ',
  borderTopWidth: 'بالا', borderRightWidth: 'راست', borderBottomWidth: 'پایین', borderLeftWidth: 'چپ',
  borderTopLeftRadius: 'بالا چپ', borderTopRightRadius: 'بالا راست', borderBottomLeftRadius: 'پایین چپ', borderBottomRightRadius: 'پایین راست',
};

export function ColorField({ name, value, onChange }: { name: string; value?: string | number; onChange: (value?: string) => void }) {
  const id = useId();
  const [input, setInput] = useState(String(value ?? ''));
  useEffect(() => setInput(String(value ?? '')), [value]);
  const valid = input === '' || /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$/.test(input);
  return <div className="widget-field"><label htmlFor={id}>{labels[name]}</label><div className="widget-color-control">
    <input type="color" value={typeof value === 'string' && value.startsWith('#') ? value.slice(0, 7) : '#007aff'} aria-label={`انتخاب ${labels[name]}`} onChange={event => onChange(event.target.value)} />
    <input id={id} dir="ltr" value={input} placeholder="خودکار" aria-label={labels[name]} aria-invalid={!valid} onChange={event => { const next = event.target.value; setInput(next); if (!next || /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent)$/.test(next)) onChange(next || undefined); }} onBlur={() => { if (!valid) setInput(String(value ?? '')); }} />
    <button type="button" onClick={() => { setInput(''); onChange(undefined); }} title="رنگ خودکار" aria-label={`بازنشانی ${labels[name]}`}><RotateCcw size={13} /></button>
  </div></div>;
}

export function NumberField({ name, value, onChange, label = labels[name], range = numericStyleRules[name], context }: { name: string; value?: string | number; label?: string; context?: string; range?: readonly [number, number]; onChange: (value?: number) => void }) {
  const [input, setInput] = useState(String(value ?? ''));
  useEffect(() => setInput(String(value ?? '')), [value]);
  const [min, max] = range;
  return <label className="widget-field"><span>{label}</span><input type="number" dir="ltr" aria-label={context ? context + ' · ' + label : label} placeholder="خودکار" min={min} max={max} step={['lineHeight', 'letterSpacing', 'opacity'].includes(name) ? .1 : 1} value={input} onChange={event => {
    const next = event.target.value;
    setInput(next);
    if (next === '') onChange(undefined);
    else if (Number.isFinite(Number(next)) && Number(next) >= min && Number(next) <= max) onChange(Number(next));
  }} onBlur={() => {
    if (input === '') return;
    const next = Math.min(max, Math.max(min, Number(input)));
    if (Number.isFinite(next)) { setInput(String(next)); onChange(next); }
    else setInput(String(value ?? ''));
  }} /></label>;
}
