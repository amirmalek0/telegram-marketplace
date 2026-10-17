import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Braces, Settings2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { apisApi } from '@/api/apis';
import { ApiResponse, HttpMethod } from '@/types/apis';
import { Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { CatalogModal as Modal } from '@/components/catalog/CatalogModal';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogIdentity } from '@/components/catalog/CatalogIdentity';
import { HeadersSection } from './HeadersSection';
import { CatalogFormSection } from '@/components/catalog/CatalogFormSection';
import { Webhook } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

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
  const [loadError, setLoadError] = useState(false);
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
  const [refreshKey, setRefreshKey] = useState(0);

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
  useEffect(() => {
    const fetchApis = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await apisApi.list({ page, per_page: PER_PAGE });
        setApis(res.data);
        setTotal(res.total);
      } catch {
        setLoadError(true);
        toast.error('خطا در دریافت API‌ها');
      } finally {
        setLoading(false);
      }
    };

    fetchApis();
  }, [page, refreshKey]);

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
      setRefreshKey(k => k + 1);
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
      setRefreshKey(k => k + 1);
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
      setRefreshKey(k => k + 1);
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
      render: (_, row) => <CatalogIdentity title={row.name} icon={Webhook} onClick={() => handleOpenEdit(row)} />,
    },
    {
      key: 'method',
      title: 'متد',
      render: (value) => (
        <Badge variant={(value as string) === 'GET' ? 'cyan' : 'success'}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: 'url',
      title: 'آدرس',
      render: (value) => (
        <span dir="ltr" className="catalog-code" title={value as string}>
          {value as string}
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



  return (
    <div className="catalog-page">
      <CatalogHeader title="اتصال API" icon={Webhook} total={total} loading={loading} actions={<><Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          API جدید
        </Button></>} />

      {/* Table */}
      <CatalogTable
          emptyAction={<Button icon={<Plus size={16} />} onClick={() => { handleOpenCreate(); }}>API جدید</Button>}
          error={loadError}
          onRefresh={() => setRefreshKey(k => k + 1)}
          searchText={row => `${row.name} ${row.url} ${row.method}`}
          filter={{ label: 'همه متدها', options: [{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }], value: row => row.method }}
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

      {/* ===== CREATE MODAL ===== */}
      <Modal
        icon={<Webhook size={19} />}
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
        <div>
          <CatalogFormSection title="اطلاعات اتصال" icon={Webhook}>
          <Input
            label="نام"
            placeholder="نام API را وارد کنید"
            error={createForm.formState.errors.name?.message}
            {...createForm.register('name')}
          />
          <Input
            label="آدرس"
            placeholder="https://api.example.com/endpoint"
            dir="ltr"
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
          </CatalogFormSection>
          <CatalogFormSection title="درخواست و پاسخ" icon={Braces}>
          <Textarea
            label="بدنه درخواست (اختیاری)"
            placeholder='{"key": "value"}'
            dir="ltr"
            rows={4}
            hint="فرمت JSON"
            {...createForm.register('body')}
          />
          <Input
            label="مسیر پاسخ (اختیاری)"
            placeholder="data.result.value"
            dir="ltr"
            hint="مثال: data.result.value"
            {...createForm.register('response_path')}
          />
          </CatalogFormSection>
          <CatalogFormSection title="تنظیمات هدر" icon={Settings2}>
          <HeadersSection
            headers={createHeaders}
            onAdd={addCreateHeader}
            onRemove={removeCreateHeader}
            onUpdate={updateCreateHeader}
          />
          </CatalogFormSection>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        icon={<Webhook size={19} />}
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
        <div>
          <CatalogFormSection title="اطلاعات اتصال" icon={Webhook}>
          <Input
            label="نام"
            placeholder="نام API را وارد کنید"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input
            label="آدرس"
            placeholder="https://api.example.com/endpoint"
            dir="ltr"
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
          </CatalogFormSection>
          <CatalogFormSection title="درخواست و پاسخ" icon={Braces}>
          <Textarea
            label="بدنه درخواست (اختیاری)"
            placeholder='{"key": "value"}'
            dir="ltr"
            rows={4}
            hint="فرمت JSON"
            {...editForm.register('body')}
          />
          <Input
            label="مسیر پاسخ (اختیاری)"
            placeholder="data.result.value"
            dir="ltr"
            hint="مثال: data.result.value"
            {...editForm.register('response_path')}
          />
          </CatalogFormSection>
          <CatalogFormSection title="تنظیمات هدر" icon={Settings2}>
          <HeadersSection
            headers={editHeaders}
            onAdd={addEditHeader}
            onRemove={removeEditHeader}
            onUpdate={updateEditHeader}
          />
          </CatalogFormSection>
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
