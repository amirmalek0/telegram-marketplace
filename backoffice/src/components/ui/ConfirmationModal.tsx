import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  children?: React.ReactNode;
  variant?: 'danger' | 'warning';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'بله، حذف شود',
  cancelText = 'انصراف',
  loading,
  children,
  variant = 'danger',
}: ConfirmationModalProps) {
  const colors = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-500',
      ring: 'ring-red-100 dark:ring-red-900/30',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-500',
      ring: 'ring-amber-100 dark:ring-amber-900/30',
    },
  };

  const c = colors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl bg-[rgb(var(--color-surface))] border border-[rgb(var(--color-border))] shadow-2xl shadow-black/20 overflow-hidden"
          >
            {/* Top accent */}
            <div className={`h-1 w-full ${variant === 'danger' ? 'bg-gradient-to-r from-red-400 via-red-500 to-rose-500' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500'}`} />

            <div className="p-6 flex flex-col items-center text-center gap-4">
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${c.bg} ring-8 ${c.ring} flex items-center justify-center`}>
                <AlertTriangle size={30} className={c.icon} />
              </div>

              {/* Text */}
              <div>
                <h3 className="text-lg font-bold text-[rgb(var(--color-text))] mb-1.5">{title}</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] leading-relaxed">{message}</p>
              </div>

              {/* Optional content (e.g. preview of item being deleted) */}
              {children && (
                <div className="w-full rounded-xl bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] p-3">
                  {children}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2.5 w-full pt-1">
                <Button
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  className="flex-1"
                  onClick={onConfirm}
                  loading={loading}
                >
                  {confirmText}
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={onClose}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
