import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Pencil, Trash2, ArrowUpDown, Image as ImageIcon
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { categoriesApi } from '@/api/categories';
import { CategoryResponse } from '@/types/categories';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { FileUpload } from '@/components/ui/FileUpload';
import { SortableItem } from '@/components/ui/SortableItem';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schemas ---
const createSchema = z.object({
  title: z.string().min(1, 'نام دسته‌بندی الزامی است'),
});

const editSchema = z.object({
  title: z.string().min(1, 'نام دسته‌بندی الزامی است'),
  active: z.boolean(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

// --- Page Component ---
export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<CategoryResponse | null>(null);

  // Sortable items for drag-and-drop
  const [sortableItems, setSortableItems] = useState<CategoryResponse[]>([]);

  // Loading states for mutations
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Icon file for create/edit
  const [createIconFile, setCreateIconFile] = useState<File | null>(null);
  const [editIconFile, setEditIconFile] = useState<File | null>(null);

  // Forms
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '' },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: '', active: true },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await categoriesApi.list({ page, per_page: PER_PAGE });
        setCategories(res.data);
        setTotal(res.total);
      } catch {
        toast.error('خطا در دریافت دسته‌بندی‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [page, refreshKey]);

  // --- Handlers ---
  const handleCreate = async (data: CreateForm) => {
    setCreating(true);
    try {
      const newCat = await categoriesApi.create({ title: data.title });

      // Upload icon if provided
      if (createIconFile && newCat.id) {
        await categoriesApi.uploadIcon(newCat.id, createIconFile);
      }

      toast.success('دسته‌بندی با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      setCreateIconFile(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ایجاد دسته‌بندی');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: EditForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      await categoriesApi.update(selected.id, {
        title: data.title,
        active: data.active,
      });

      // Upload new icon if provided
      if (editIconFile) {
        await categoriesApi.uploadIcon(selected.id, editIconFile);
      }

      toast.success('دسته‌بندی با موفقیت ویرایش شد');
      setEditOpen(false);
      setEditIconFile(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ویرایش دسته‌بندی');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await categoriesApi.delete(selected.id);
      toast.success('دسته‌بندی با موفقیت حذف شد');
      setDeleteOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در حذف دسته‌بندی');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (cat: CategoryResponse) => {
    setSelected(cat);
    editForm.reset({ title: cat.title, active: cat.active });
    setEditIconFile(null);
    setEditOpen(true);
  };

  const handleOpenDelete = (cat: CategoryResponse) => {
    setSelected(cat);
    setDeleteOpen(true);
  };

  const handleOpenSort = () => {
    // Sort by sort_order descending for display
    const sorted = [...categories].sort((a, b) => b.sort_order - a.sort_order);
    setSortableItems(sorted);
    setSortOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSortableItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    setReordering(true);
    try {
      // Assign sort_order: highest number = first in list (descending)
      const items = sortableItems.map((item, index) => ({
        id: item.id,
        sort_order: sortableItems.length - index,
      }));
      await categoriesApi.reorder({ items });
      toast.success('ترتیب دسته‌بندی‌ها با موفقیت ذخیره شد');
      setSortOpen(false);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ذخیره ترتیب');
    } finally {
      setReordering(false);
    }
  };

  // --- Table Columns ---
  const columns: Column<CategoryResponse>[] = [
    {
      key: 'icon_url',
      title: 'تصویر',
      render: (value) => (
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[rgb(var(--color-border))] flex items-center justify-center">
          {value ? (
            <img src={value as string} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-[rgb(var(--color-text-secondary))]" />
          )}
        </div>
      ),
    },
    {
      key: 'title',
      title: 'نام',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'sort_order',
      title: 'ترتیب',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))]">{value as number}</span>
      ),
    },
    {
      key: 'active',
      title: 'وضعیت',
      render: (value) => (
        <Badge variant={value ? 'success' : 'default'} dot>
          {value ? 'فعال' : 'غیرفعال'}
        </Badge>
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

  if (loading && categories.length === 0) {
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
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">دسته‌بندی‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت دسته‌بندی‌های محصولات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            icon={<ArrowUpDown size={16} />}
            onClick={handleOpenSort}
          >
            مرتب‌سازی
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              createForm.reset();
              setCreateIconFile(null);
              setCreateOpen(true);
            }}
          >
            دسته‌بندی جدید
          </Button>
        </div>
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
          data={categories}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ دسته‌بندی‌ای یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد دسته‌بندی جدید"
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
            label="نام دسته‌بندی"
            placeholder="مثال: لباس، الکترونیک..."
            error={createForm.formState.errors.title?.message}
            {...createForm.register('title')}
          />
          <div>
            <label className="text-sm font-medium text-[rgb(var(--color-text))] block mb-1.5">
              تصویر دسته‌بندی (اختیاری)
            </label>
            <FileUpload
              onFileSelect={setCreateIconFile}
              accept="image/*"
              maxSize={5}
              label="آپلود تصویر"
            />
            {createIconFile && (
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-1">
                فایل انتخاب شده: {createIconFile.name}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش دسته‌بندی"
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
            label="نام دسته‌بندی"
            placeholder="نام دسته‌بندی"
            error={editForm.formState.errors.title?.message}
            {...editForm.register('title')}
          />

          {/* Current icon preview */}
          {selected?.icon_url && (
            <div>
              <label className="text-sm font-medium text-[rgb(var(--color-text))] block mb-1.5">
                تصویر فعلی
              </label>
              <img
                src={selected.icon_url}
                alt={selected.title}
                className="w-20 h-20 rounded-xl object-cover border border-[rgb(var(--color-border))]"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-[rgb(var(--color-text))] block mb-1.5">
              تصویر جدید (اختیاری)
            </label>
            <FileUpload
              onFileSelect={setEditIconFile}
              accept="image/*"
              maxSize={5}
              label="تغییر تصویر"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))]">
            <span className="text-sm font-medium text-[rgb(var(--color-text))]">وضعیت فعال</span>
            <Toggle
              checked={editForm.watch('active')}
              onChange={(val) => editForm.setValue('active', val)}
            />
          </div>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف دسته‌بندی"
        message={`آیا از حذف دسته‌بندی "${selected?.title}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      >
        {selected?.icon_url && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--color-bg))] border border-[rgb(var(--color-border))]">
            <img
              src={selected.icon_url}
              alt={selected.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <span className="font-medium text-[rgb(var(--color-text))]">{selected.title}</span>
          </div>
        )}
      </ConfirmationModal>

      {/* ===== SORT ORDER MODAL ===== */}
      <Modal
        isOpen={sortOpen}
        onClose={() => setSortOpen(false)}
        title="مرتب‌سازی دسته‌بندی‌ها"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSortOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={reordering}
              onClick={handleSaveOrder}
            >
              ذخیره ترتیب
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">
            آیتم‌ها را با کشیدن و رها کردن مرتب کنید. ترتیب از بالا به پایین نمایش داده می‌شود.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortableItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortableItems.map((item) => (
                  <SortableItem key={item.id} id={item.id}>
                    <div className="flex items-center gap-3">
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.title}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[rgb(var(--color-border))] flex items-center justify-center">
                          <ImageIcon size={14} className="text-[rgb(var(--color-text-secondary))]" />
                        </div>
                      )}
                      <span className="font-medium text-[rgb(var(--color-text))]">{item.title}</span>
                      <Badge variant={item.active ? 'success' : 'default'} dot className="mr-auto">
                        {item.active ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </Modal>
    </div>
  );
}
