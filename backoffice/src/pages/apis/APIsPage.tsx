import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { apisApi } from '@/api/apis';
import { ApiResponse, HttpMethod } from '@/types/apis';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// --- Zod Schema ---
const apiSchema = z.object({
  name: z.string().min(1, 'نام API الزامی است'),
  url: z.string().min(1, 'آدرس API الزامی است'),
  method: z.enum(['GET', 'POST']),
  body: z.string().optional(),
  response_path: z.string().optional(),
});

type ApiForm = z.infer<typeof apiSchema>;

type HeaderRow = { key: string; value: string };

// --- Page Component ---
export default function APIsPage() {
  const [apis, setApis] = useState<ApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const PER_PAGE = 20;

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected item
  const [selected, setSelected] = useState<ApiResponse | null>(null);

  // Loading states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Headers state
  const [createHeaders, setCreateHeaders] = useState<HeaderRow[]>([]);
  const [editHeaders, setEditHeaders] = useState<HeaderRow[]>([]);

  // Forms
  const createForm = useForm<ApiForm>({
    resolver: zodResolver(apiSchema),
    defaultValues: { name: '', url: '', method: 'GET', body: '', response_path: '' },
  });

  const editForm = useForm<ApiForm>({
    resolver: zodResolver(apiSchema),
    defaultValues: { name: '', url: '', method: 'GET', body: '', response_path: '' },
  });

  // --- Data Fetching ---
  const fetchApis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apisApi.list({ page, per_page: PER_PAGE });
      setApis(res.data);
      setTotal(res.total);
    } catch {
      toast.error('خطا در دریافت API‌ها');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchApis();
  }, [fetchApis]);

  // --- Header helpers ---
  const addCreateHeader = () => setCreateHeaders([...createHeaders, { key: '', value: '' }]);
  const removeCreateHeader = (index: number) =>
    setCreateHeaders(createHeaders.filter((_, i) => i !== index));
  const updateCreateHeader = (index: number, field: 'key' | 'value', value: string) =>
    setCreateHeaders(createHeaders.map((h, i) => (i === index ? { ...h, [field]: value } : h)));

  const addEditHeader = () => setEditHeaders([...editHeaders, { key: '', value: '' }]);
  const removeEditHeader = (index: number) =>
    setEditHeaders(editHeaders.filter((_, i) => i !== index));
  const updateEditHeader = (index: number, field: 'key' | 'value', value: string) =>
    setEditHeaders(editHeaders.map((h, i) => (i === index ? { ...h, [field]: value } : h)));

  // --- Handlers ---
  const handleCreate = async (data: ApiForm) => {
    setCreating(true);
    try {
      const validHeaders = createHeaders.filter((h) => h.key.trim() && h.value.trim());
      await apisApi.create({
        name: data.name,
        url: data.url,
        method: data.method as HttpMethod,
        body: data.body || undefined,
        response_path: data.response_path || undefined,
        headers: validHeaders.length > 0 ? validHeaders : undefined,
      });
      toast.success('API با موفقیت ایجاد شد');
      setCreateOpen(false);
      createForm.reset();
      setCreateHeaders([]);
      fetchApis();
    } catch {
      toast.error('خطا در ایجاد API');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (data: ApiForm) => {
    if (!selected) return;
    setEditing(true);
    try {
      const validHeaders = editHeaders.filter((h) => h.key.trim() && h.value.trim());
      await apisApi.update(selected.id, {
        name: data.name,
        url: data.url,
        method: data.method as HttpMethod,
        body: data.body || undefined,
        response_path: data.response_path || undefined,
        headers: validHeaders,
      });
      toast.success('API با موفقیت ویرایش شد');
      setEditOpen(false);
      fetchApis();
    } catch {
      toast.error('خطا در ویرایش API');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await apisApi.delete(selected.id);
      toast.success('API با موفقیت حذف شد');
      setDeleteOpen(false);
      fetchApis();
    } catch {
      toast.error('خطا در حذف API');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenCreate = () => {
    createForm.reset({ name: '', url: '', method: 'GET', body: '', response_path: '' });
    setCreateHeaders([]);
    setCreateOpen(true);
  };

  const handleOpenEdit = (api: ApiResponse) => {
    setSelected(api);
    editForm.reset({
      name: api.name,
      url: api.url,
      method: api.method,
      body: api.body ?? '',
      response_path: api.response_path ?? '',
    });
    setEditHeaders(api.headers ? [...api.headers] : []);
    setEditOpen(true);
  };

  const handleOpenDelete = (api: ApiResponse) => {
    setSelected(api);
    setDeleteOpen(true);
  };

  // --- Table Columns ---
  const columns: Column<ApiResponse>[] = [
    {
      key: 'name',
      title: 'نام',
      render: (value) => (
        <span className="font-medium text-[rgb(var(--color-text))]">{value as string}</span>
      ),
    },
    {
      key: 'method',
      title: 'متد',
      render: (value) => (
        <Badge variant={(value as string) === 'GET' ? 'info' : 'success'}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'url',
      title: 'آدرس',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))] text-xs font-mono">
          {(value as string).length > 50
            ? `${(value as string).substring(0, 50)}...`
            : (value as string)}
        </span>
      ),
    },
    {
      key: 'headers',
      title: 'تعداد هدر',
      render: (value) => (
        <span className="text-[rgb(var(--color-text-secondary))]">
          {Array.isArray(value) ? value.length : 0}
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

  if (loading && apis.length === 0) {
    return <PageLoader />;
  }

  // --- Reusable Headers Section ---
  const HeadersSection = ({
    headers,
    onAdd,
    onRemove,
    onUpdate,
  }: {
    headers: HeaderRow[];
    onAdd: () => void;
    onRemove: (i: number) => void;
    onUpdate: (i: number, field: 'key' | 'value', val: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[rgb(var(--color-text))]">هدرها</label>
        <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
          افزودن هدر
        </Button>
      </div>
      {headers.length === 0 ? (
        <p className="text-xs text-[rgb(var(--color-text-secondary))] py-2">
          هیچ هدری تعریف نشده است
        </p>
      ) : (
        <div className="space-y-2">
          {headers.map((header, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="کلید"
                value={header.key}
                onChange={(e) => onUpdate(index, 'key', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50"
              />
              <input
                type="text"
                placeholder="مقدار"
                value={header.value}
                onChange={(e) => onUpdate(index, 'value', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg))] text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-[#0088cc]/50"
              />
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
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
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">API‌ها</h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))] mt-1">
            مدیریت سرویس‌های API خارجی
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          API جدید
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
          data={apis}
          loading={loading}
          keyExtractor={(row) => row.id}
          pagination={{
            page,
            perPage: PER_PAGE,
            total,
            onPageChange: setPage,
          }}
          emptyMessage="هیچ API‌ای یافت نشد"
        />
      </motion.div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="ایجاد API جدید"
        size="xl"
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
            label="نام"
            placeholder="نام API را وارد کنید"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
          <Input
            label="آدرس"
            placeholder="https://api.example.com/endpoint"
            error={createForm.formState.errors.url?.message}
            {...createForm.register('url')}
          />
          <Select
            label="متد"
            value={createForm.watch('method')}
            onChange={(e) => createForm.setValue('method', e.target.value as HttpMethod)}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
            ]}
          />
          <Textarea
            label="بدنه درخواست (اختیاری)"
            placeholder='{"key": "value"}'
            rows={4}
            hint="فرمت JSON"
            {...createForm.register('body')}
          />
          <Input
            label="مسیر پاسخ (اختیاری)"
            placeholder="data.result.value"
            hint="مثال: data.result.value"
            {...createForm.register('response_path')}
          />
          <HeadersSection
            headers={createHeaders}
            onAdd={addCreateHeader}
            onRemove={removeCreateHeader}
            onUpdate={updateCreateHeader}
          />
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="ویرایش API"
        size="xl"
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
            label="نام"
            placeholder="نام API را وارد کنید"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input
            label="آدرس"
            placeholder="https://api.example.com/endpoint"
            error={editForm.formState.errors.url?.message}
            {...editForm.register('url')}
          />
          <Select
            label="متد"
            value={editForm.watch('method')}
            onChange={(e) => editForm.setValue('method', e.target.value as HttpMethod)}
            options={[
              { value: 'GET', label: 'GET' },
              { value: 'POST', label: 'POST' },
            ]}
          />
          <Textarea
            label="بدنه درخواست (اختیاری)"
            placeholder='{"key": "value"}'
            rows={4}
            hint="فرمت JSON"
            {...editForm.register('body')}
          />
          <Input
            label="مسیر پاسخ (اختیاری)"
            placeholder="data.result.value"
            hint="مثال: data.result.value"
            {...editForm.register('response_path')}
          />
          <HeadersSection
            headers={editHeaders}
            onAdd={addEditHeader}
            onRemove={removeEditHeader}
            onUpdate={updateEditHeader}
          />
        </div>
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف API"
        message={`آیا از حذف API "${selected?.name}" اطمینان دارید؟ این عمل قابل بازگشت نیست.`}
        loading={deleting}
      />
    </div>
  );
}
