import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui';
type HeaderRow = { key: string; value: string };
export const HeadersSection = ({
    headers,
    onAdd,
    onRemove,
    onUpdate,
  }: {
    headers: HeaderRow[];
    onAdd: () => void;
    onRemove: (i: number) => void;
    onUpdate: (i: number, field: 'key' | 'value', val: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[rgb(var(--color-text))]">هدرها</label>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
          افزودن هدر
        </Button>
      </div>
      {headers.length === 0 ? (
        <p className="text-xs text-[rgb(var(--color-text-secondary))] py-2">
          هیچ هدری تعریف نشده است
        </p>
      ) : (
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="کلید"
                value={header.key}
                onChange={(e) => onUpdate(index, 'key', e.target.value)}
                dir="ltr"
                aria-label={"هدر " + (index + 1) + " — " + "کلید"}
                className="min-w-0 flex-1 px-3 py-2 text-sm rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50"
              />
              <input
                type="text"
                placeholder="مقدار"
                value={header.value}
                onChange={(e) => onUpdate(index, 'value', e.target.value)}
                dir="ltr"
                aria-label={"هدر " + (index + 1) + " — مقدار"}
                className="min-w-0 flex-1 px-3 py-2 text-sm rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`حذف هدر ${index + 1}`}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
