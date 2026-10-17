import { useEffect, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  description,
  icon,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const focusable = () => Array.from(contentRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab') {
        const elements = focusable();
        const first = elements[0], last = elements[elements.length - 1];
        if (!first) { e.preventDefault(); contentRef.current?.focus(); return; }
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    const frame = requestAnimationFrame(() => {
      const input = contentRef.current?.querySelector<HTMLElement>('input:not([disabled]):not([type="file"]), textarea:not([disabled]), select:not([disabled])');
      (input || focusable()[0] || contentRef.current)?.focus();
    });
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative w-full rounded-2xl flex flex-col',
              'bg-[rgb(var(--color-surface))]',
              'border border-[rgb(var(--color-border))]',
              'shadow-2xl shadow-black/20',
              'max-h-[90vh]',
              sizes[size], className
            )}
          >
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-[#0088cc]/40 to-transparent" />

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[rgb(var(--color-border))] flex-shrink-0">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="w-9 h-9 rounded-xl bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] flex-shrink-0">
                    {icon}
                  </div>
                )}
                <div>
                  <h2 id={titleId} className="text-base font-bold text-[rgb(var(--color-text))] leading-tight">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                aria-label="بستن پنجره"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[rgb(var(--color-text-muted))] hover:text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-surface-2))] transition-all flex-shrink-0 mr-2"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[rgb(var(--color-border))] flex items-center justify-end gap-2.5 flex-shrink-0 bg-[rgb(var(--color-surface-2))]/50 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
