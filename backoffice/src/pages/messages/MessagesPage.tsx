import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { messagesApi } from '@/api/messages';
import { MessageResponse } from '@/types/messages';
import { Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CatalogModal as Modal } from '@/components/catalog/CatalogModal';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogIdentity } from '@/components/catalog/CatalogIdentity';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { MessageSquareText, Type } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';

// --- Zod Schemas ---
const messageSchema = z.object({
  name: z.string().trim().min(1, 'نام پیام الزامی است').max(120, 'نام پیام باید حداکثر ۱۲۰ نویسه باشد'),
  content: z.string().min(1, 'محتوای پیام الزامی است'),
});

type MessageForm = z.infer<typeof messageSchema>;

// --- Page Component ---
export default function MessagesPage() {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
    defaultValues: { name: '', content: '' },
  });

  const editForm = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: { name: '', content: '' },
  });

  // --- Data Fetching ---
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await messagesApi.list({ page, per_page: PER_PAGE });
        setMessages(res.data);
        setTotal(res.total);
      } catch {
        setLoadError(true);
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
      await messagesApi.create(data);
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
      await messagesApi.update(selected.id, data);
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
    editForm.reset({ name: msg.name, content: msg.content });
    setEditOpen(true);
  };

  const handleOpenDelete = (msg: MessageResponse) => {
    setSelected(msg);
    setDeleteOpen(true);
  };

  // --- Table Columns ---
  const columns: Column<MessageResponse>[] = [
    {
      key: 'name',
      title: 'نام پیام',
      render: (_, row) => <CatalogIdentity title={row.name} icon={MessageSquareText} onClick={() => handleOpenEdit(row)} />,
    },
    {
      key: 'content',
      title: 'محتوا',
      render: (value) => (
        <span className="catalog-preview" title={value as string}>
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


  return (
    <div className="catalog-page">
      <CatalogHeader title="پیام تحویل" icon={MessageSquareText} total={total} loading={loading} actions={<><Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => {
            createForm.reset();
            setCreateOpen(true);
          }}
        >
          پیام جدید
        </Button></>} />

      {/* Table */}
      <CatalogTable
          emptyAction={<Button icon={<Plus size={16} />} onClick={() => { createForm.reset(); setCreateOpen(true); }}>پیام جدید</Button>}
          error={loadError}
          onRefresh={() => setRefreshKey(k => k + 1)}
          searchText={row => `${row.name} ${row.content}`}
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

      {/* ===== CREATE MODAL ===== */}
      <Modal
        icon={<MessageSquareText size={19} />}
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
        <div>
          <CatalogFormSection title="اطلاعات پیام" icon={Type}>
          <Input label="نام پیام" placeholder="مثلاً راهنمای فعال‌سازی محصول" maxLength={120} error={createForm.formState.errors.name?.message} {...createForm.register('name')} />
          </CatalogFormSection>
          <CatalogFormSection title="پیام ارسالی به خریدار" icon={MessageSquareText}>
          <Textarea
            label="محتوای پیام"
            placeholder="متن پیام را وارد کنید..."
            rows={8}
            error={createForm.formState.errors.content?.message}
            {...createForm.register('content')}
          />
          </CatalogFormSection>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        icon={<MessageSquareText size={19} />}
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
        <div>
          <CatalogFormSection title="اطلاعات پیام" icon={Type}>
          <Input label="نام پیام" placeholder="مثلاً راهنمای فعال‌سازی محصول" maxLength={120} error={editForm.formState.errors.name?.message} {...editForm.register('name')} />
          </CatalogFormSection>
          <CatalogFormSection title="پیام ارسالی به خریدار" icon={MessageSquareText}>
          <Textarea
            label="محتوای پیام"
            placeholder="متن پیام را وارد کنید..."
            rows={8}
            error={editForm.formState.errors.content?.message}
            {...editForm.register('content')}
          />
          </CatalogFormSection>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف پیام"
        message={`آیا از حذف پیام «${selected?.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />
    </div>
  );
}
