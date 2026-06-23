import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[rgb(var(--color-text))]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-xl border bg-[rgb(var(--color-surface))] px-4 py-2.5 text-sm',
            'text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-secondary))]',
            'border-[rgb(var(--color-border))] focus:border-[#0088cc] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20',
            'transition-all duration-200 resize-none',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            className
          )}
          rows={4}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-[rgb(var(--color-text-secondary))]">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
