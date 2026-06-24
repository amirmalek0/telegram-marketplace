import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { adminsApi } from '@/api/admins';
import { AdminResponse } from '@/types/admins';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schemas ---
const createSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
});

const editSchema = z.object({
  username: z.string().min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد'),
  password: z.string().optional(),
  is_active: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// --- Date Formatter ---
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// --- Password Strength Indicator ---
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { min: 0, max: 1, label: 'ضعیف', color: 'bg-red-500', textColor: 'text-red-500' },
    { min: 2, max: 2, label: 'متوسط', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
    { min: 3, max: 3, label: 'خوب', color: 'bg-blue-500', textColor: 'text-blue-500' },
    { min: 4, max: 5, label: 'قوی', color: 'bg-green-500', textColor: 'text-green-500' },
  ];

  const level = levels.find((l) => score >= l.min && score <= l.max) || levels[0];
  const barCount = score <= 1 ? 1 : score <= 2 ? 2 : score <= 3 ? 3 : 4;

  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= barCount ? level.color : 'bg-[rgb(var(--color-border))]'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${level.textColor}`}>قدرت رمز عبور: {level.label}</p>
    </div>
  );
}

// --- Page Component ---
export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<AdminResponse | null>(null);

  // Loading states for mutations
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Forms
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { username: '', password: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { username: '', password: '', is_active: true },
  });

  // Watch passwords for strength indicator
  const createPassword = createForm.watch('password');
  const editPassword = editForm.watch('password');

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAdmins = async () => {
      setLoading(true);
      try {
        const res = await adminsApi.list({ page, per_page: PER_PAGE });
        // Backend returns { admins: [...], total, ... }
        setAdmins(Array.isArray(res.admins) ? res.admins : []);
        setTotal(res.total ?? 0);
      } catch {
        toast.error('خطا در دریافت مدیران');
      } finally {
        setLoading(false);
      }
    };

    fetchAdmins();
  }, [page, refreshKey]);

  // --- Handlers ---
  const handleCreate = async (data: CreateForm) => {
    setCreating(true);
    try {
      await adminsApi.create({ username: data.username, password: data.password });
      toast.success('مدیر با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ایجاد مدیر');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: EditForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      const updateData = {
        username: data.username,
        is_active: data.is_active,
        ...(data.password ? { password: data.password } : {}),
      };
      await adminsApi.update(selected.id, updateData);
      toast.success('مدیر با موفقیت ویرایش شد');
      setEditOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ویرایش مدیر');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await adminsApi.delete(selected.id);
      toast.success('مدیر با موفقیت حذف شد');
      setDeleteOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در حذف مدیر');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (admin: AdminResponse) => {
    setSelected(admin);
    editForm.reset({ username: admin.username, password: '', is_active: admin.is_active });
    setEditOpen(true);
  };

  const handleOpenDelete = (admin: AdminResponse) => {
    setSelected(admin);
    setDeleteOpen(true);
  };

  // --- Table Columns ---
  const columns: Column<AdminResponse>[] = [
    {
      key: 'username',
      title: 'نام کاربری',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'is_active',
      title: 'وضعیت',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'} dot>
          {value ? 'فعال' : 'غیرفعال'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: 'تاریخ ایجاد',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {formatDate(value as string)}
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

  if (loading && admins.length === 0) {
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
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">مدیران</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت حساب‌های ادمین سیستم
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
          مدیر جدید
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
          data={admins}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ مدیری یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد مدیر جدید"
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
            label="نام کاربری"
            placeholder="حداقل ۳ کاراکتر"
            error={createForm.formState.errors.username?.message}
            {...createForm.register('username')}
          />
          <div>
            <Input
              label="رمز عبور"
              type="password"
              placeholder="حداقل ۸ کاراکتر"
              error={createForm.formState.errors.password?.message}
              {...createForm.register('password')}
            />
            <PasswordStrength password={createPassword} />
          </div>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش مدیر"
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
            label="نام کاربری"
            placeholder="نام کاربری"
            error={editForm.formState.errors.username?.message}
            {...editForm.register('username')}
          />
          <div>
            <Input
              label="رمز عبور جدید (اختیاری)"
              type="password"
              placeholder="در صورت تغییر وارد کنید"
              error={editForm.formState.errors.password?.message}
              {...editForm.register('password')}
            />
            <PasswordStrength password={editPassword ?? ''} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))]">
            <span className="text-sm font-medium text-[rgb(var(--color-text))]">وضعیت فعال</span>
            <Toggle
              checked={editForm.watch('is_active')}
              onChange={(val) => editForm.setValue('is_active', val)}
            />
          </div>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف مدیر"
        message={`آیا از حذف مدیر "${selected?.username}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))]">
          <div className="w-10 h-10 rounded-full bg-[rgb(var(--color-border))] flex items-center justify-center text-sm font-bold text-[rgb(var(--color-text-secondary))]">
            {selected?.username?.charAt(0)?.toUpperCase()}
          </div>
          <span className="font-medium text-[rgb(var(--color-text))]">{selected?.username}</span>
        </div>
      </ConfirmationModal>
    </div>
  );
}
