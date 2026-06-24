import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { filesApi } from '@/api/files';
import { FileResponse } from '@/types/files';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Helpers ---
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// --- Zod Schema ---
const uploadSchema = z.object({
  name: z.string().optional(),
});

type UploadForm = z.infer<typeof uploadSchema>;

// --- Page Component ---
export default function FilesPage() {
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<FileResponse | null>(null);

  // Loading states
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // File for upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Form
  const uploadForm = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { name: '' },
  });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const res = await filesApi.list({ page, per_page: PER_PAGE });
        setFiles(res.data);
        setTotal(res.total);
      } catch {
        toast.error('خطا در دریافت فایل‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [page, refreshKey]);

  // --- Handlers ---
  const handleUpload = async (data: UploadForm) => {
    if (!uploadFile) {
      toast.error('لطفاً یک فایل انتخاب کنید');
      return;
    }
    setUploading(true);
    try {
      await filesApi.upload(uploadFile, data.name || undefined);
      toast.success('فایل با موفقیت آپلود شد');
      setUploadOpen(false);
      uploadForm.reset();
      setUploadFile(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در آپلود فایل');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await filesApi.delete(selected.id);
      toast.success('فایل با موفقیت حذف شد');
      setDeleteOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در حذف فایل');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDelete = (file: FileResponse) => {
    setSelected(file);
    setDeleteOpen(true);
  };

  const handleDownload = (file: FileResponse) => {
    window.open(file.url, '_blank');
  };

  // --- Table Columns ---
  const columns: Column<FileResponse>[] = [
    {
      key: 'name',
      title: 'نام',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'size',
      title: 'حجم فایل',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {formatFileSize(value as number)}
        </span>
      ),
    },
    {
      key: 'mime_type',
      title: 'نوع فایل',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))] text-xs font-mono">
          {value as string}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: 'تاریخ ایجاد',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {new Date(value as string).toLocaleDateString('fa-IR')}
        </span>
      ),
    },
    {
      key: 'id',
      title: 'عملیات',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => handleDownload(row)}
          >
            دانلود
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => handleOpenDelete(row)}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            حذف
          </Button>
        </div>
      ),
    },
  ];

  if (loading && files.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">فایل‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت فایل‌های آپلود شده
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            uploadForm.reset();
            setUploadFile(null);
            setUploadOpen(true);
          }}
        >
          آپلود فایل
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6"
      >
        <DataTable
          columns={columns}
          data={files}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ فایلی یافت نشد"
        />
      </motion.div>

      {/* ===== UPLOAD MODAL ===== */}
      <Modal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="آپلود فایل جدید"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUploadOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={uploading}
              onClick={uploadForm.handleSubmit(handleUpload)}
            >
              آپلود
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[rgb(var(--color-text))] block mb-1.5">
              فایل (حداکثر ۵۰ مگابایت)
            </label>
            <FileUpload
              onFileSelect={setUploadFile}
              maxSize={50}
              label="انتخاب فایل"
            />
            {uploadFile && (
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
                فایل انتخاب شده: {uploadFile.name} ({formatFileSize(uploadFile.size)})
              </p>
            )}
          </div>
          <Input
            label="نام فایل (اختیاری)"
            placeholder="نام دلخواه برای فایل"
            {...uploadForm.register('name')}
          />
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف فایل"
        message={`آیا از حذف فایل "${selected?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />
    </div>
  );
}
