import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, File as FileIcon, Image } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  label?: string;
  hint?: string;
  error?: string;
  preview?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  accept = '*',
  maxSize = 10,
  label,
  hint,
  error: externalError,
  preview = true,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);

  const error = externalError || internalError;

  const handleFile = useCallback(
    (file: File) => {
      setInternalError(null);

      if (file.size > maxSize * 1024 * 1024) {
        setInternalError(`حجم فایل نباید بیشتر از ${maxSize} مگابایت باشد`);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);

      if (preview && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [maxSize, onFileSelect, preview]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setInternalError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const isImage = selectedFile?.type.startsWith('image/');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-[rgb(var(--color-text))]">{label}</label>
      )}

      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] overflow-hidden"
          >
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt="پیش‌نمایش"
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-lg bg-[#0088cc]/10 flex items-center justify-center flex-shrink-0">
                  {isImage ? (
                    <Image size={20} className="text-[#0088cc]" />
                  ) : (
                    <FileIcon size={20} className="text-[#0088cc]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[rgb(var(--color-text))] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-text-secondary))]">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ) : (
          <motion.label
            key="dropzone"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer',
              'transition-all duration-200',
              isDragging
                ? 'border-[#0088cc] bg-[#0088cc]/5'
                : 'border-[rgb(var(--color-border))] hover:border-[#0088cc]/50 hover:bg-[rgb(var(--color-surface))]',
              error && 'border-red-500'
            )}
          >
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="sr-only"
            />
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
              isDragging ? 'bg-[#0088cc]/20' : 'bg-[rgb(var(--color-border))]'
            )}>
              <Upload size={22} className={isDragging ? 'text-[#0088cc]' : 'text-[rgb(var(--color-text-secondary))]'} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[rgb(var(--color-text))]">
                فایل را اینجا رها کنید یا{' '}
                <span className="text-[#0088cc]">انتخاب کنید</span>
              </p>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
                حداکثر {maxSize} مگابایت
              </p>
            </div>
          </motion.label>
        )}
      </AnimatePresence>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[rgb(var(--color-text-secondary))]">{hint}</p>}
    </div>
  );
}
