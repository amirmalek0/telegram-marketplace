import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { inventoryApi } from '@/api/inventory';
import { InventoryResponse, InventoryItemResponse } from '@/types/inventory';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schemas ---
const inventorySchema = z.object({
  name: z.string().min(1, 'نام موجودی الزامی است'),
});

type InventoryForm = z.infer<typeof inventorySchema>;

// --- Status helpers ---
const statusLabel = (status: string): string => {
  switch (status) {
    case 'available': return 'موجود';
    case 'sold': return 'فروخته شده';
    case 'reserved': return 'رزرو شده';
    default: return status;
  }
};

const statusVariant = (status: string): 'success' | 'warning' | 'info' | 'default' => {
  switch (status) {
    case 'available': return 'success';
    case 'sold': return 'warning';
    case 'reserved': return 'info';
    default: return 'default';
  }
};

// --- Page Component ---
export default function InventoryPage() {
  const [inventories, setInventories] = useState<InventoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<InventoryResponse | null>(null);

  // Loading states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Items modal state
  const [items, setItems] = useState<InventoryItemResponse[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newItemsText, setNewItemsText] = useState('');
  const [addingItems, setAddingItems] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Forms
  const createForm = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { name: '' },
  });

  const editForm = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { name: '' },
  });

  // --- Data Fetching ---
  const fetchInventories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.list({ page, per_page: PER_PAGE });
      setInventories(res.data);
      setTotal(res.total);
    } catch {
      toast.error('خطا در دریافت موجودی‌ها');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  const fetchItems = useCallback(async (inventoryId: string) => {
    setItemsLoading(true);
    try {
      // Backend returns a plain array (not paginated)
      const res = await inventoryApi.listItems(inventoryId);
      setItems(Array.isArray(res) ? res : []);
    } catch {
      toast.error('خطا در دریافت آیتم‌ها');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  // --- Handlers ---
  const handleCreate = async (data: InventoryForm) => {
    setCreating(true);
    try {
      await inventoryApi.create({ name: data.name });
      toast.success('موجودی با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      fetchInventories();
    } catch {
      toast.error('خطا در ایجاد موجودی');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: InventoryForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      await inventoryApi.update(selected.id, { name: data.name });
      toast.success('موجودی با موفقیت ویرایش شد');
      setEditOpen(false);
      fetchInventories();
    } catch {
      toast.error('خطا در ویرایش موجودی');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await inventoryApi.delete(selected.id);
      toast.success('موجودی با موفقیت حذف شد');
      setDeleteOpen(false);
      fetchInventories();
    } catch {
      toast.error('خطا در حذف موجودی');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (inv: InventoryResponse) => {
    setSelected(inv);
    editForm.reset({ name: inv.name });
    setEditOpen(true);
  };

  const handleOpenDelete = (inv: InventoryResponse) => {
    setSelected(inv);
    setDeleteOpen(true);
  };

  const handleOpenItems = (inv: InventoryResponse) => {
    setSelected(inv);
    setItems([]);
    setNewItemsText('');
    setItemsOpen(true);
    fetchItems(inv.id);
  };

  const handleAddItems = async () => {
    if (!selected) return;
    const values = newItemsText
      .split('\n')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (values.length === 0) {
      toast.error('لطفاً حداقل یک مقدار وارد کنید');
      return;
    }

    setAddingItems(true);
    try {
      await inventoryApi.bulkAddItems(selected.id, { values });
      toast.success(`${values.length} آیتم با موفقیت اضافه شد`);
      setNewItemsText('');
      fetchItems(selected.id);
    } catch {
      toast.error('خطا در افزودن آیتم‌ها');
    } finally {
      setAddingItems(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!selected) return;
    setDeletingItemId(itemId);
    try {
      await inventoryApi.deleteItem(selected.id, itemId);
      toast.success('آیتم با موفقیت حذف شد');
      fetchItems(selected.id);
    } catch {
      toast.error('خطا در حذف آیتم');
    } finally {
      setDeletingItemId(null);
    }
  };

  // --- Table Columns ---
  const columns: Column<InventoryResponse>[] = [
    {
      key: 'name',
      title: 'نام',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
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
            icon={<Package size={14} />}
            onClick={() => handleOpenItems(row)}
          >
            مدیریت آیتم‌ها
          </Button>
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

  // Items table columns
  const itemColumns: Column<InventoryItemResponse>[] = [
    {
      key: 'value',
      title: 'مقدار',
      render: (value) => (
        <span className="font-mono text-sm text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (value) => (
        <Badge variant={statusVariant(value as string)}>
          {statusLabel(value as string)}
        </Badge>
      ),
    },
    {
      key: 'id',
      title: 'عملیات',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 size={14} />}
          loading={deletingItemId === row.id}
          onClick={() => handleDeleteItem(row.id)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          حذف
        </Button>
      ),
    },
  ];

  if (loading && inventories.length === 0) {
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
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">موجودی‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت موجودی‌ها و آیتم‌های قابل فروش
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
          موجودی جدید
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
          data={inventories}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ موجودی‌ای یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد موجودی جدید"
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
            label="نام موجودی"
            placeholder="مثال: کدهای تخفیف، لایسنس‌ها..."
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش موجودی"
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
            label="نام موجودی"
            placeholder="نام موجودی"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف موجودی"
        message={`آیا از حذف موجودی "${selected?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />

      {/* ===== ITEMS MANAGEMENT MODAL ===== */}
      <Modal
        isOpen={itemsOpen}
        onClose={() => setItemsOpen(false)}
        title={`مدیریت آیتم‌های: ${selected?.name ?? ''}`}
        size="xl"
        footer={
          <Button variant="secondary" onClick={() => setItemsOpen(false)}>
            بستن
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Items Table */}
          <DataTable
            columns={itemColumns}
            data={items}
            loading={itemsLoading}
            keyExtractor={(row) => row.id}
            emptyMessage="هیچ آیتمی یافت نشد"
          />

          {/* Add Items Section */}
          <div className="border-t border-[rgb(var(--color-border))] pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-[rgb(var(--color-text))]">
              افزودن آیتم‌های جدید
            </h3>
            <p className="text-xs text-[rgb(var(--color-text-secondary))]">
              هر آیتم را در یک خط جداگانه وارد کنید
            </p>
            <Textarea
              placeholder="مقدار اول&#10;مقدار دوم&#10;مقدار سوم..."
              rows={5}
              value={newItemsText}
              onChange={(e) => setNewItemsText(e.target.value)}
            />
            <Button
              variant="primary"
              loading={addingItems}
              onClick={handleAddItems}
            >
              افزودن آیتم‌ها
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
