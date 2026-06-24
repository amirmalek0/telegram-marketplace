import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { messagesApi } from '@/api/messages';
import { MessageResponse } from '@/types/messages';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Textarea } from '@/components/ui/Textarea';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schemas ---
const messageSchema = z.object({
  content: z.string().min(1, 'محتوای پیام الزامی است'),
});

type MessageForm = z.infer<typeof messageSchema>;

// --- Page Component ---
export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<MessageResponse | null>(null);

  // Loading states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Forms
  const createForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  const editForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { content: '' },
  });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await messagesApi.list({ page, per_page: PER_PAGE });
        setMessages(res.data);
        setTotal(res.total);
      } catch {
        toast.error('خطا در دریافت پیام‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [page, refreshKey]);

  // --- Handlers ---
  const handleCreate = async (data: MessageForm) => {
    setCreating(true);
    try {
      await messagesApi.create({ content: data.content });
      toast.success('پیام با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ایجاد پیام');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: MessageForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      await messagesApi.update(selected.id, { content: data.content });
      toast.success('پیام با موفقیت ویرایش شد');
      setEditOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ویرایش پیام');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await messagesApi.delete(selected.id);
      toast.success('پیام با موفقیت حذف شد');
      setDeleteOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در حذف پیام');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (msg: MessageResponse) => {
    setSelected(msg);
    editForm.reset({ content: msg.content });
    setEditOpen(true);
  };

  const handleOpenDelete = (msg: MessageResponse) => {
    setSelected(msg);
    setDeleteOpen(true);
  };

  // --- Table Columns ---
  const columns: Column<MessageResponse>[] = [
    {
      key: 'content',
      title: 'محتوا',
      render: (value) => (
        <span className="text-[rgb(var(--color-text))]">
          {(value as string).length > 80
            ? `${(value as string).substring(0, 80)}...`
            : (value as string)}
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

  if (loading && messages.length === 0) {
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
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">پیام‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت پیام‌های از پیش تعریف شده
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
        >
          پیام جدید
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
          data={messages}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ پیامی یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد پیام جدید"
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
          <Textarea
            label="محتوای پیام"
            placeholder="متن پیام را وارد کنید..."
            rows={6}
            error={createForm.formState.errors.content?.message}
            {...createForm.register('content')}
          />
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش پیام"
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
          <Textarea
            label="محتوای پیام"
            placeholder="متن پیام را وارد کنید..."
            rows={6}
            error={editForm.formState.errors.content?.message}
            {...editForm.register('content')}
          />
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف پیام"
        message={`آیا از حذف پیام "${selected?.content.substring(0, 50)}${(selected?.content.length ?? 0) > 50 ? '...' : ''}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />
    </div>
  );
}
