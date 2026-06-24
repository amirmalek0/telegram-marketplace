import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm, Controller, Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { productsApi } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { filesApi } from '@/api/files';
import { messagesApi } from '@/api/messages';
import { inventoryApi } from '@/api/inventory';
import { bundlesApi } from '@/api/bundles';
import { apisApi } from '@/api/apis';

import { ProductResponse, DeliveryType, ProductStatus } from '@/types/products';
import { CategoryResponse } from '@/types/categories';
import { FileResponse } from '@/types/files';
import { MessageResponse } from '@/types/messages';
import { InventoryResponse } from '@/types/inventory';
import { BundleResponse } from '@/types/bundles';
import { ApiResponse } from '@/types/apis';

import { DataTable } from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';

// ─── Constants ───────────────────────────────────────────────────────────────

const deliveryTypeLabels: Record<DeliveryType, string> = {
  file: 'فایل',
  message: 'پیام',
  inventory: 'مخزن',
  bundle: 'بسته',
  api: 'API',
};

const statusLabels: Record<ProductStatus, string> = {
  active: 'فعال',
  draft: 'پیش‌نویس',
  archived: 'آرشیو',
};

const statusVariants: Record<ProductStatus, 'success' | 'info' | 'default'> = {
  active: 'success',
  draft: 'info',
  archived: 'default',
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fa-IR').format(price) + ' تومان';

const PER_PAGE = 20;

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const productSchema = z.object({
  title: z.string().min(1, 'نام محصول الزامی است'),
  description: z.string(),
  price: z
    .number({ message: 'قیمت باید عدد باشد' })
    .positive('قیمت باید بزرگتر از صفر باشد'),
  category_id: z.string().min(1, 'دسته‌بندی الزامی است'),
  delivery_type: z.enum(['file', 'message', 'inventory', 'bundle', 'api'] as const),
  file_id: z.string().optional(),
  message_id: z.string().optional(),
  inventory_id: z.string().optional(),
  bundle_id: z.string().optional(),
  api_id: z.string().optional(),
  demo_url: z.string().optional(),
  vip_only: z.boolean(),
  status: z.enum(['active', 'draft', 'archived'] as const),
});

type ProductForm = z.infer<typeof productSchema>;

// ─── DeliveryTypeSection ─────────────────────────────────────────────────────

function DeliveryTypeSection({
  deliveryType,
  control,
  errors,
}: {
  deliveryType: DeliveryType | '';
  control: Control<ProductForm>;
  errors: FieldErrors<ProductForm>;
}) {
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [inventories, setInventories] = useState<InventoryResponse[]>([]);
  const [bundles, setBundles] = useState<BundleResponse[]>([]);
  const [apisList, setApisList] = useState<ApiResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deliveryType) return;
    setLoading(true);

    const fetchMap: Record<DeliveryType, () => Promise<void>> = {
      file: async () => {
        const res = await filesApi.list({ per_page: 100 });
        setFiles(res.data);
      },
      message: async () => {
        const res = await messagesApi.list({ per_page: 100 });
        setMessages(res.data);
      },
      inventory: async () => {
        const res = await inventoryApi.list({ per_page: 100 });
        setInventories(res.data);
      },
      bundle: async () => {
        const res = await bundlesApi.list({ per_page: 100 });
        setBundles(res.data);
      },
      api: async () => {
        const res = await apisApi.list({ per_page: 100 });
        setApisList(res.data);
      },
    };

    fetchMap[deliveryType]().finally(() => setLoading(false));
  }, [deliveryType]);

  if (!deliveryType) return null;

  if (loading) {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-text-secondary))]">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
          در حال بارگذاری...
        </div>
      </div>
    );
  }

  if (deliveryType === 'file') {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <Controller
          name="file_id"
          control={control}
          render={({ field }) => (
            <Select
              label="انتخاب فایل"
              placeholder="یک فایل انتخاب کنید"
              options={files.map((f) => ({ value: f.id, label: f.name }))}
              error={errors.file_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    );
  }

  if (deliveryType === 'message') {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <Controller
          name="message_id"
          control={control}
          render={({ field }) => (
            <Select
              label="انتخاب پیام"
              placeholder="یک پیام انتخاب کنید"
              options={messages.map((m) => ({
                value: m.id,
                label: m.content.slice(0, 60) + (m.content.length > 60 ? '...' : ''),
              }))}
              error={errors.message_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    );
  }

  if (deliveryType === 'inventory') {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <Controller
          name="inventory_id"
          control={control}
          render={({ field }) => (
            <Select
              label="انتخاب مخزن"
              placeholder="یک مخزن انتخاب کنید"
              options={inventories.map((inv) => ({ value: inv.id, label: inv.name }))}
              error={errors.inventory_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    );
  }

  if (deliveryType === 'bundle') {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <Controller
          name="bundle_id"
          control={control}
          render={({ field }) => (
            <Select
              label="انتخاب بسته"
              placeholder="یک بسته انتخاب کنید"
              options={bundles.map((b) => ({ value: b.id, label: b.name }))}
              error={errors.bundle_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    );
  }

  if (deliveryType === 'api') {
    return (
      <div className="border-2 border-dashed border-[rgb(var(--color-border))] rounded-xl p-4">
        <Controller
          name="api_id"
          control={control}
          render={({ field }) => (
            <Select
              label="انتخاب API"
              placeholder="یک API انتخاب کنید"
              options={apisList.map((a) => ({ value: a.id, label: a.name }))}
              error={errors.api_id?.message}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    );
  }

  return null;
}

// ─── Shared form fields ───────────────────────────────────────────────────────

interface ProductFormFieldsProps {
  register: UseFormRegister<ProductForm>;
  control: Control<ProductForm>;
  errors: FieldErrors<ProductForm>;
  isEdit: boolean;
  deliveryType: DeliveryType | '';
  categoryOptions: { value: string; label: string }[];
  deliveryTypeOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
}

function ProductFormFields({
  register,
  control,
  errors,
  isEdit,
  deliveryType,
  categoryOptions,
  deliveryTypeOptions,
  statusOptions,
}: ProductFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <Input
        label="نام محصول"
        placeholder="نام محصول را وارد کنید"
        error={errors.title?.message}
        {...register('title')}
      />

      {/* Description */}
      <Textarea
        label="توضیحات"
        placeholder="توضیحات محصول را وارد کنید"
        rows={3}
        error={errors.description?.message}
        {...register('description')}
      />

      {/* Price */}
      <Input
        label="قیمت (تومان)"
        type="number"
        placeholder="قیمت را وارد کنید"
        error={errors.price?.message}
        {...register('price', { valueAsNumber: true })}
      />

      {/* Category */}
      <Controller
        name="category_id"
        control={control}
        render={({ field }) => (
          <Select
            label="دسته‌بندی"
            placeholder="یک دسته‌بندی انتخاب کنید"
            options={categoryOptions}
            error={errors.category_id?.message}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* Delivery Type */}
      <Controller
        name="delivery_type"
        control={control}
        render={({ field }) => (
          <Select
            label="نوع تحویل"
            placeholder="نوع تحویل را انتخاب کنید"
            options={deliveryTypeOptions}
            error={errors.delivery_type?.message}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {/* Dynamic delivery resource */}
      <DeliveryTypeSection
        deliveryType={deliveryType}
        control={control}
        errors={errors}
      />

      {/* Demo URL */}
      <Input
        label="لینک دمو (اختیاری)"
        placeholder="https://..."
        error={errors.demo_url?.message}
        {...register('demo_url')}
      />

      {/* VIP Only */}
      <Controller
        name="vip_only"
        control={control}
        render={({ field }) => (
          <Toggle
            checked={field.value}
            onChange={field.onChange}
            label="فقط برای کاربران VIP"
          />
        )}
      />

      {/* Status — only in edit mode */}
      {isEdit && (
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <Select
              label="وضعیت"
              options={statusOptions}
              error={errors.status?.message}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}
    </div>
  );
}

// ─── ProductsPage ─────────────────────────────────────────────────────────────

export default function ProductsPage() {
  // ── Data state ──
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Modal state ──
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ProductResponse | null>(null);

  // ── Mutation loading ──
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const defaultValues: ProductForm = {
    title: '',
    description: '',
    price: 0,
    category_id: '',
    delivery_type: 'file',
    file_id: '',
    message_id: '',
    inventory_id: '',
    bundle_id: '',
    api_id: '',
    demo_url: '',
    vip_only: false,
    status: 'active',
  };

  // ── Forms ──
  const createForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const editForm = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  // Watch delivery_type for dynamic section
  const createDeliveryType = createForm.watch('delivery_type') as DeliveryType | '';
  const editDeliveryType = editForm.watch('delivery_type') as DeliveryType | '';

  // ── Fetch products ──
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await productsApi.list({ page, per_page: PER_PAGE });
        setProducts(res.data);
        setTotal(res.total);
      } catch {
        toast.error('خطا در بارگذاری محصولات');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, refreshKey]);

  // ── Fetch categories (once) ──
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoriesApi.list({ per_page: 200 });
        setCategories(res.data);
      } catch {
        toast.error('خطا در بارگذاری دسته‌بندی‌ها');
      }
    };

    fetchCategories();
  }, []);

  // ── Category lookup helper ──
  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.title : id;
  };

  // ── Create ──
  const handleCreate = async (data: ProductForm) => {
    setCreating(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        price: data.price,
        category_id: data.category_id,
        delivery_type: data.delivery_type,
        demo_url: data.demo_url || undefined,
        vip_only: data.vip_only,
        file_id: data.delivery_type === 'file' ? data.file_id || undefined : undefined,
        message_id: data.delivery_type === 'message' ? data.message_id || undefined : undefined,
        inventory_id:
          data.delivery_type === 'inventory' ? data.inventory_id || undefined : undefined,
        bundle_id: data.delivery_type === 'bundle' ? data.bundle_id || undefined : undefined,
        api_id: data.delivery_type === 'api' ? data.api_id || undefined : undefined,
      };
      await productsApi.create(payload);
      toast.success('محصول با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset(defaultValues);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ایجاد محصول');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit open ──
  const handleEditOpen = (product: ProductResponse) => {
    setSelected(product);
    editForm.reset({
      title: product.title,
      description: product.description,
      price: product.price,
      category_id: product.category_id,
      delivery_type: product.delivery_type,
      file_id: product.file_id ?? '',
      message_id: product.message_id ?? '',
      inventory_id: product.inventory_id ?? '',
      bundle_id: product.bundle_id ?? '',
      api_id: product.api_id ?? '',
      demo_url: product.demo_url ?? '',
      vip_only: product.vip_only,
      status: product.status,
    });
    setEditOpen(true);
  };

  // ── Edit submit ──
  const handleEdit = async (data: ProductForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        price: data.price,
        category_id: data.category_id,
        delivery_type: data.delivery_type,
        demo_url: data.demo_url || undefined,
        vip_only: data.vip_only,
        status: data.status,
        file_id: data.delivery_type === 'file' ? data.file_id || undefined : undefined,
        message_id: data.delivery_type === 'message' ? data.message_id || undefined : undefined,
        inventory_id:
          data.delivery_type === 'inventory' ? data.inventory_id || undefined : undefined,
        bundle_id: data.delivery_type === 'bundle' ? data.bundle_id || undefined : undefined,
        api_id: data.delivery_type === 'api' ? data.api_id || undefined : undefined,
      };
      await productsApi.update(selected.id, payload);
      toast.success('محصول با موفقیت ویرایش شد');
      setEditOpen(false);
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در ویرایش محصول');
    } finally {
      setEditing(false);
    }
  };

  // ── Delete ──
  const handleDeleteOpen = (product: ProductResponse) => {
    setSelected(product);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await productsApi.delete(selected.id);
      toast.success('محصول با موفقیت حذف شد');
      setDeleteOpen(false);
      setSelected(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('خطا در حذف محصول');
    } finally {
      setDeleting(false);
    }
  };

  // ── Select options ──
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.title }));

  const deliveryTypeOptions = (
    Object.entries(deliveryTypeLabels) as [DeliveryType, string][]
  ).map(([value, label]) => ({ value, label }));

  const statusOptions = (Object.entries(statusLabels) as [ProductStatus, string][]).map(
    ([value, label]) => ({ value, label })
  );

  // ── Table columns ──
  const columns: Column<ProductResponse>[] = [
    {
      key: 'title',
      title: 'نام',
      render: (_, row) => (
        <span className="font-semibold text-[rgb(var(--color-text))]">{row.title}</span>
      ),
    },
    {
      key: 'category_id',
      title: 'دسته‌بندی',
      render: (_, row) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {getCategoryName(row.category_id)}
        </span>
      ),
    },
    {
      key: 'price',
      title: 'قیمت',
      render: (_, row) => (
        <span className="text-[rgb(var(--color-text))]">{formatPrice(row.price)}</span>
      ),
    },
    {
      key: 'delivery_type',
      title: 'نوع تحویل',
      render: (_, row) => (
        <Badge variant="purple">{deliveryTypeLabels[row.delivery_type]}</Badge>
      ),
    },
    {
      key: 'vip_only',
      title: 'VIP',
      render: (_, row) =>
        row.vip_only ? <Badge variant="amber">VIP</Badge> : <span>-</span>,
    },
    {
      key: 'views_count',
      title: 'بازدید',
      render: (_, row) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {new Intl.NumberFormat('fa-IR').format(row.views_count)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'وضعیت',
      render: (_, row) => (
        <Badge variant={statusVariants[row.status]} dot>{statusLabels[row.status]}</Badge>
      ),
    },
    {
      key: 'id',
      title: 'عملیات',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEditOpen(row)}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text))] transition-colors"
            title="ویرایش"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => handleDeleteOpen(row)}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-[rgb(var(--color-text-secondary))] hover:text-red-500 transition-colors"
            title="حذف"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">محصولات</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت محصولات فروشگاه
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            createForm.reset(defaultValues);
            setCreateOpen(true);
          }}
        >
          <Plus size={16} />
          محصول جدید
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl p-0 overflow-hidden">
        <DataTable<ProductResponse>
          columns={columns}
          data={products}
          loading={loading}
          keyExtractor={(row) => row.id}
          emptyMessage="هیچ محصولی یافت نشد"
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
        />
      </div>

      {/* ── Create Modal ── */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="افزودن محصول جدید"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={createForm.handleSubmit(handleCreate)}
            >
              ایجاد محصول
            </Button>
          </div>
        }
      >
        <ProductFormFields
          register={createForm.register}
          control={createForm.control}
          errors={createForm.formState.errors}
          isEdit={false}
          deliveryType={createDeliveryType}
          categoryOptions={categoryOptions}
          deliveryTypeOptions={deliveryTypeOptions}
          statusOptions={statusOptions}
        />
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelected(null);
        }}
        title="ویرایش محصول"
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                setEditOpen(false);
                setSelected(null);
              }}
              disabled={editing}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              loading={editing}
              onClick={editForm.handleSubmit(handleEdit)}
            >
              ذخیره تغییرات
            </Button>
          </div>
        }
      >
        <ProductFormFields
          register={editForm.register}
          control={editForm.control}
          errors={editForm.formState.errors}
          isEdit={true}
          deliveryType={editDeliveryType}
          categoryOptions={categoryOptions}
          deliveryTypeOptions={deliveryTypeOptions}
          statusOptions={statusOptions}
        />
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelected(null);
        }}
        onConfirm={handleDelete}
        title="حذف محصول"
        message={
          selected
            ? `آیا از حذف محصول "${selected.title}" اطمینان دارید؟ این عملیات قابل بازگشت نیست.`
            : 'آیا از حذف این محصول اطمینان دارید؟'
        }
        confirmText="بله، حذف شود"
        cancelText="خیر، انصراف"
        loading={deleting}
      />
    </motion.div>
  );
}
