import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || label;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[rgb(var(--color-text))]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]">
              {rightIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-xl border bg-[rgb(var(--color-surface))] px-4 py-2.5 text-sm',
              'text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-secondary))]',
              'border-[rgb(var(--color-border))] focus:border-[#0088cc] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/20',
              'transition-all duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              rightIcon && 'pr-10',
              leftIcon && 'pl-10',
              className
            )}
            {...props}
          />
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--color-text-secondary))]">
              {leftIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-[rgb(var(--color-text-secondary))]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
