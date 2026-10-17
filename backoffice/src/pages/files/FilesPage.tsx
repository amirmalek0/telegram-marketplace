import { useState, useEffect } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { filesApi } from '@/api/files';
import { FileResponse } from '@/types/files';
import { Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CatalogModal as Modal } from '@/components/catalog/CatalogModal';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogIdentity } from '@/components/catalog/CatalogIdentity';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { FileArchive, UploadCloud, Type } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { FileUpload } from '@/components/ui/FileUpload';

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
  const [loadError, setLoadError] = useState(false);
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
      setLoadError(false);
      try {
        const res = await filesApi.list({ page, per_page: PER_PAGE });
        setFiles(res.data);
        setTotal(res.total);
      } catch {
        setLoadError(true);
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
    window.open(file.url, '_blank', 'noopener,noreferrer');
  };

  // --- Table Columns ---
  const columns: Column<FileResponse>[] = [
    {
      key: 'name',
      title: 'نام',
      render: (_, row) => <CatalogIdentity title={row.name} icon={FileArchive}  />,
    },
    {
      key: 'size',
      title: 'حجم فایل',
      render: (value) => (
        <span dir="ltr" className="text-[rgb(var(--color-text-secondary))] whitespace-nowrap">
          {formatFileSize(value as number)}
        </span>
      ),
    },
    {
      key: 'mime_type',
      title: 'نوع فایل',
      render: (value) => (
        <span dir="ltr" className="catalog-code">
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


  return (
    <div className="catalog-page">
      <CatalogHeader title="فایل" icon={FileArchive} total={total} loading={loading} actions={<><Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            uploadForm.reset();
            setUploadFile(null);
            setUploadOpen(true);
          }}
        >
          آپلود فایل
        </Button></>} />

      {/* Table */}
      <CatalogTable
          emptyAction={<Button icon={<Plus size={16} />} onClick={() => { uploadForm.reset(); setUploadFile(null); setUploadOpen(true); }}>آپلود فایل</Button>}
          error={loadError}
          onRefresh={() => setRefreshKey(k => k + 1)}
          searchText={row => `${row.name} ${row.mime_type}`}
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

      {/* ===== UPLOAD MODAL ===== */}
      <Modal
        icon={<FileArchive size={19} />}
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
        <div>
          <CatalogFormSection title="فایل تحویل" icon={UploadCloud}>
          <div>
            <FileUpload
              onFileSelect={setUploadFile}
              maxSize={50}
            />
            {uploadFile && (
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
                فایل انتخاب شده: {uploadFile.name} ({formatFileSize(uploadFile.size)})
              </p>
            )}
          </div>
          </CatalogFormSection>
          <CatalogFormSection title="اطلاعات فایل" icon={Type}>
          <Input
            label="نام فایل (اختیاری)"
            placeholder="نام دلخواه برای فایل"
            {...uploadForm.register('name')}
          />
          </CatalogFormSection>
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
