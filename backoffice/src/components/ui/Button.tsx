import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';
import { LoadingSpinner } from './LoadingSpinner';
import { forwardRef } from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20',
      secondary:
        'bg-[rgb(var(--color-surface))] hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text))] border border-[rgb(var(--color-border))]',
      danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
      ghost: 'hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text))]',
      outline: 'border border-blue-600 text-blue-600 hover:bg-blue-600/10',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: isDisabled ? 1 : 1.02 }}
        whileTap={{ scale: isDisabled ? 1 : 0.98 }}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <LoadingSpinner
            size="sm"
            className={
              variant === 'primary' || variant === 'danger'
                ? 'border-white/20 border-t-white'
                : ''
            }
          />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
