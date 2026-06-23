import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border bg-[rgb(var(--color-surface))] border-[rgb(var(--color-border))]',
        'transition-shadow duration-200',
        isDragging && 'shadow-2xl opacity-80 z-50 scale-105',
        className
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] transition-colors touch-none"
        type="button"
      >
        <GripVertical size={18} />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}
