import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, disabled, size = 'md' }: ToggleProps) {
  const sizes = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translateX: 18 },
    md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translateX: 22 },
  };

  const s = sizes[size];

  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0088cc]/30',
          s.track,
          checked ? 'bg-[#0088cc]' : 'bg-[rgb(var(--color-border))]'
        )}
      >
        <motion.span
          className={cn('absolute bg-white rounded-full shadow-sm', s.thumb)}
          animate={{ x: checked ? s.translateX : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ left: 0 }}
        />
      </button>
      {label && (
        <span className="text-sm text-[rgb(var(--color-text))]">{label}</span>
      )}
    </label>
  );
}
