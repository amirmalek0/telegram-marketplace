import { useId, useMemo, useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Calendar, DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persianFa from 'react-date-object/locales/persian_fa';
import './jalali-date-time-picker.css';

interface Props {
  label: string;
  /** RFC3339 instant, or an empty string for no expiry. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function JalaliDateTimePicker({ label, value, onChange, disabled = false }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const date = useMemo(() => value ? new Date(value) : null, [value]);
  const selected = useMemo(() => date && !Number.isNaN(date.getTime()) ? new DateObject({ date, calendar: persian, locale: persianFa }) : null, [date]);
  const time = date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const chooseDay = (day: DateObject | null) => {
    if (!day?.isValid) return;
    const next = day.toDate();
    // Preserve the chosen time when changing days; a new expiry defaults to end-of-day.
    next.setHours(date?.getHours() ?? 23, date?.getMinutes() ?? 59, 0, 0);
    onChange(next.toISOString());
  };

  return <div className="jalali-date-field sm:col-span-2" onKeyDown={event => {
    if (open && event.key === 'Escape') { event.stopPropagation(); setOpen(false); }
  }}>
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <div className="jalali-date-controls">
      <button type="button" id={id} disabled={disabled} aria-expanded={open} aria-controls={`${id}-calendar`} className="jalali-date-trigger" onClick={() => setOpen(v => !v)}>
        <CalendarDays size={17} /><span>{selected ? selected.format('YYYY/MM/DD') : 'انتخاب تاریخ شمسی (اختیاری)'}</span><ChevronDown size={16} />
      </button>
      {selected && <>
        <input type="time" aria-label="ساعت انقضا" value={time} disabled={disabled} required step={60} onChange={event => {
          if (!date || !/^\d{2}:\d{2}$/.test(event.target.value)) return;
          const [hour, minute] = event.target.value.split(':').map(Number);
          const next = new Date(date); next.setHours(hour, minute, 0, 0); onChange(next.toISOString());
        }} />
        <button type="button" className="jalali-date-clear" disabled={disabled} onClick={() => { onChange(''); setOpen(false); }}>حذف تاریخ</button>
      </>}
    </div>
    {open && <div id={`${id}-calendar`} className="jalali-calendar-panel" aria-label="تقویم شمسی تاریخ انقضا">
      <Calendar calendar={persian} locale={persianFa} value={selected} onChange={chooseDay} disabled={disabled} weekStartDayIndex={0} className="jalali-calendar" shadow={false} />
      <button type="button" className="jalali-date-done" onClick={() => setOpen(false)}>تأیید تاریخ</button>
    </div>}
    <p className="text-xs leading-5 text-[rgb(var(--color-text-muted))]">{selected ? <>زمان محلی شما: <bdi>{zone}</bdi></> : 'بدون انتخاب تاریخ، کد تخفیف تاریخ انقضا ندارد.'}</p>
  </div>;
}
