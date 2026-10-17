import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmationModalProps {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmText?: string; cancelText?: string;
  loading?: boolean; children?: React.ReactNode; variant?: 'danger' | 'warning';
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'بله، حذف شود', cancelText = 'انصراف', loading, children, variant = 'danger' }: ConfirmationModalProps) {
  return <Modal isOpen={isOpen} onClose={() => !loading && onClose()} title={title} size="sm" icon={<AlertTriangle size={19} className={variant === 'danger' ? 'text-rose-500' : 'text-amber-500'} />} footer={<>
    <Button variant="secondary" disabled={loading} onClick={onClose}>{cancelText}</Button>
    <Button variant={variant === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmText}</Button>
  </>}>
    <p className="text-sm leading-7 text-[rgb(var(--color-text-secondary))]">{message}</p>
    {children && <div className="mt-4 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">{children}</div>}
  </Modal>;
}
