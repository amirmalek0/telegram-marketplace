import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { bundlesApi } from '@/api/bundles';
import { filesApi } from '@/api/files';
import { messagesApi } from '@/api/messages';
import { inventoryApi } from '@/api/inventory';
import { BundleResponse } from '@/types/bundles';
import { FileResponse } from '@/types/files';
import { MessageResponse } from '@/types/messages';
import { InventoryResponse } from '@/types/inventory';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schema ---
const bundleSchema = z.object({
  name: z.string().min(1, 'نام باندل الزامی است'),
});

type BundleForm = z.infer<typeof bundleSchema>;

// --- Page Component ---
export default function BundlesPage() {
  const [bundles, setBundles] = useState<BundleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<BundleResponse | null>(null);

  // Loading states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Related data
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [inventories, setInventories] = useState<InventoryResponse[]>([]);

  // Toggle states for create modal
  const [createFileEnabled, setCreateFileEnabled] = useState(false);
  const [createMessageEnabled, setCreateMessageEnabled] = useState(false);
  const [createInventoryEnabled, setCreateInventoryEnabled] = useState(false);
  const [createFileId, setCreateFileId] = useState('');
  const [createMessageId, setCreateMessageId] = useState('');
  const [createInventoryId, setCreateInventoryId] = useState('');

  // Toggle states for edit modal
  const [editFileEnabled, setEditFileEnabled] = useState(false);
  const [editMessageEnabled, setEditMessageEnabled] = useState(false);
  const [editInventoryEnabled, setEditInventoryEnabled] = useState(false);
  const [editFileId, setEditFileId] = useState('');
  const [editMessageId, setEditMessageId] = useState('');
  const [editInventoryId, setEditInventoryId] = useState('');

  // Forms
  const createForm = useForm<BundleForm>({
    resolver: zodResolver(bundleSchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<BundleForm>({
    resolver: zodResolver(bundleSchema),
    defaultValues: { name: '' },
  });

  // --- Data Fetching ---
  const fetchBundles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bundlesApi.list({ page, per_page: PER_PAGE });
      setBundles(res.data);
      setTotal(res.total);
    } catch {
      toast.error('خطا در دریافت باندل‌ها');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const fetchRelatedData = useCallback(async () => {
    try {
      const [filesRes, messagesRes, inventoriesRes] = await Promise.all([
        filesApi.list({ per_page: 100 }),
        messagesApi.list({ per_page: 100 }),
        inventoryApi.list({ per_page: 100 }),
      ]);
      setFiles(filesRes.data);
      setMessages(messagesRes.data);
      setInventories(inventoriesRes.data);
    } catch {
      toast.error('خطا در دریافت داده‌های مرتبط');
    }
  }, []);

  // --- Handlers ---
  const handleCreate = async (data: BundleForm) => {
    setCreating(true);
    try {
      await bundlesApi.create({
        name: data.name,
        file_id: createFileEnabled && createFileId ? createFileId : undefined,
        message_id: createMessageEnabled && createMessageId ? createMessageId : undefined,
        inventory_id: createInventoryEnabled && createInventoryId ? createInventoryId : undefined,
      });
      toast.success('باندل با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      resetCreateToggles();
      fetchBundles();
    } catch {
      toast.error('خطا در ایجاد باندل');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: BundleForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      await bundlesApi.update(selected.id, {
        name: data.name,
        file_id: editFileEnabled && editFileId ? editFileId : null,
        message_id: editMessageEnabled && editMessageId ? editMessageId : null,
        inventory_id: editInventoryEnabled && editInventoryId ? editInventoryId : null,
      });
      toast.success('باندل با موفقیت ویرایش شد');
      setEditOpen(false);
      fetchBundles();
    } catch {
      toast.error('خطا در ویرایش باندل');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await bundlesApi.delete(selected.id);
      toast.success('باندل با موفقیت حذف شد');
      setDeleteOpen(false);
      fetchBundles();
    } catch {
      toast.error('خطا در حذف باندل');
    } finally {
      setDeleting(false);
    }
  };

  const resetCreateToggles = () => {
    setCreateFileEnabled(false);
    setCreateMessageEnabled(false);
    setCreateInventoryEnabled(false);
    setCreateFileId('');
    setCreateMessageId('');
    setCreateInventoryId('');
  };

  const handleOpenCreate = () => {
    createForm.reset();
    resetCreateToggles();
    fetchRelatedData();
    setCreateOpen(true);
  };

  const handleOpenEdit = (bundle: BundleResponse) => {
    setSelected(bundle);
    editForm.reset({ name: bundle.name });
    setEditFileEnabled(!!bundle.file_id);
    setEditMessageEnabled(!!bundle.message_id);
    setEditInventoryEnabled(!!bundle.inventory_id);
    setEditFileId(bundle.file_id ?? '');
    setEditMessageId(bundle.message_id ?? '');
    setEditInventoryId(bundle.inventory_id ?? '');
    fetchRelatedData();
    setEditOpen(true);
  };

  const handleOpenDelete = (bundle: BundleResponse) => {
    setSelected(bundle);
    setDeleteOpen(true);
  };

  // --- Table Columns ---
  const columns: Column<BundleResponse>[] = [
    {
      key: 'name',
      title: 'نام',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'file_id',
      title: 'فایل',
      render: (value) => (
        <span className={value ? 'text-green-500' : 'text-[rgb(var(--color-text-secondary))]'}>
          {value ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'message_id',
      title: 'پیام',
      render: (value) => (
        <span className={value ? 'text-green-500' : 'text-[rgb(var(--color-text-secondary))]'}>
          {value ? '✓' : '—'}
        </span>
      ),
    },
    {
      key: 'inventory_id',
      title: 'موجودی',
      render: (value) => (
        <span className={value ? 'text-green-500' : 'text-[rgb(var(--color-text-secondary))]'}>
          {value ? '✓' : '—'}
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
            icon={<Pencil size={14} />}
            onClick={() => handleOpenEdit(row)}
          >
            ویرایش
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

  if (loading && bundles.length === 0) {
    return <PageLoader />;
  }

  // --- Reusable component section card ---
  const SectionCard = ({
    title,
    enabled,
    onToggle,
    children,
  }: {
    title: string;
    enabled: boolean;
    onToggle: (val: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-[rgb(var(--color-border))] overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-bg))]">
        <span className="text-sm font-medium text-[rgb(var(--color-text))]">{title}</span>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <div className="p-3 border-t border-[rgb(var(--color-border))]">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">باندل‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت باندل‌های تحویل محصول
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          باندل جدید
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
          data={bundles}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ باندلی یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد باندل جدید"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={createForm.handleSubmit(handleCreate)}
            >
              ایجاد
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام باندل"
            placeholder="نام باندل را وارد کنید"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />

          <SectionCard
            title="فایل"
            enabled={createFileEnabled}
            onToggle={(val) => {
              setCreateFileEnabled(val);
              if (!val) setCreateFileId('');
            }}
          >
            <Select
              label=""
              value={createFileId}
              onChange={(e) => setCreateFileId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب فایل...' },
                ...files.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </SectionCard>

          <SectionCard
            title="پیام"
            enabled={createMessageEnabled}
            onToggle={(val) => {
              setCreateMessageEnabled(val);
              if (!val) setCreateMessageId('');
            }}
          >
            <Select
              label=""
              value={createMessageId}
              onChange={(e) => setCreateMessageId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب پیام...' },
                ...messages.map((m) => ({
                  value: m.id,
                  label: m.content.length > 50 ? `${m.content.substring(0, 50)}...` : m.content,
                })),
              ]}
            />
          </SectionCard>

          <SectionCard
            title="موجودی"
            enabled={createInventoryEnabled}
            onToggle={(val) => {
              setCreateInventoryEnabled(val);
              if (!val) setCreateInventoryId('');
            }}
          >
            <Select
              label=""
              value={createInventoryId}
              onChange={(e) => setCreateInventoryId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب موجودی...' },
                ...inventories.map((inv) => ({ value: inv.id, label: inv.name })),
              ]}
            />
          </SectionCard>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش باندل"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={editing}
              onClick={editForm.handleSubmit(handleEdit)}
            >
              ذخیره تغییرات
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="نام باندل"
            placeholder="نام باندل را وارد کنید"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />

          <SectionCard
            title="فایل"
            enabled={editFileEnabled}
            onToggle={(val) => {
              setEditFileEnabled(val);
              if (!val) setEditFileId('');
            }}
          >
            <Select
              label=""
              value={editFileId}
              onChange={(e) => setEditFileId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب فایل...' },
                ...files.map((f) => ({ value: f.id, label: f.name })),
              ]}
            />
          </SectionCard>

          <SectionCard
            title="پیام"
            enabled={editMessageEnabled}
            onToggle={(val) => {
              setEditMessageEnabled(val);
              if (!val) setEditMessageId('');
            }}
          >
            <Select
              label=""
              value={editMessageId}
              onChange={(e) => setEditMessageId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب پیام...' },
                ...messages.map((m) => ({
                  value: m.id,
                  label: m.content.length > 50 ? `${m.content.substring(0, 50)}...` : m.content,
                })),
              ]}
            />
          </SectionCard>

          <SectionCard
            title="موجودی"
            enabled={editInventoryEnabled}
            onToggle={(val) => {
              setEditInventoryEnabled(val);
              if (!val) setEditInventoryId('');
            }}
          >
            <Select
              label=""
              value={editInventoryId}
              onChange={(e) => setEditInventoryId(e.target.value)}
              options={[
                { value: '', label: 'انتخاب موجودی...' },
                ...inventories.map((inv) => ({ value: inv.id, label: inv.name })),
              ]}
            />
          </SectionCard>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف باندل"
        message={`آیا از حذف باندل "${selected?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />
    </div>
  );
}
