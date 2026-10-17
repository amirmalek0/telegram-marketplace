import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, dir, ...props }, ref) => {
    const inputId = id || label;

    return (
      <div dir={dir} className="flex min-w-0 max-w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[rgb(var(--color-text))]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              'w-full min-w-0 appearance-none truncate rounded-xl border bg-[rgb(var(--color-surface))] ps-4 pe-10 py-2.5 text-sm',
              'text-[rgb(var(--color-text))]',
              'border-[rgb(var(--color-border))] focus:border-[#0088cc] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20',
              'transition-all duration-200 cursor-pointer',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="absolute end-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))] pointer-events-none"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-[rgb(var(--color-text-secondary))]">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
