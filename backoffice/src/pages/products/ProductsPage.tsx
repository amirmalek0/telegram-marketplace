import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { categoriesApi, productsApi } from '@/api';
import { Badge, Button, ConfirmationModal, DataTable, PageHeader } from '@/components/ui';
import type { Column } from '@/components/ui';
import type { CategoryResponse } from '@/types/categories';
import type { ProductResponse, ProductStatus } from '@/types/products';
import { publicAssetURL } from '@/utils/assets';
import { deliveryTypeLabels, statusLabels } from './productForm';

const PER_PAGE = 20;
const statusVariants: Record<ProductStatus, 'success' | 'info' | 'default'> = { active: 'success', draft: 'info', archived: 'default' };

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ProductResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [productPage, categoryPage] = await Promise.all([
        productsApi.list({ page, per_page: PER_PAGE }),
        categoriesApi.list({ per_page: 200 }),
      ]);
      setProducts(productPage.data);
      setTotal(productPage.total);
      setCategories(categoryPage.data);
    } catch { toast.error('خطا در بارگذاری محصولات'); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);

  const categoryNames = useMemo(() => new Map(categories.map(item => [item.id, item.title])), [categories]);
  const remove = async () => {
    if (!selected) return;
    setDeleting(true);
    try { await productsApi.delete(selected.id); toast.success('محصول حذف شد'); setSelected(null); await load(); }
    catch { toast.error('حذف محصول ناموفق بود'); }
    finally { setDeleting(false); }
  };

  const columns: Column<ProductResponse>[] = [
    { key: 'image_url', title: 'تصویر', render: (value, row) => <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-[rgb(var(--color-border))]">{value ? <img src={publicAssetURL(String(value))} alt={row.title} className="h-full w-full object-cover"/> : <ImageIcon size={18} className="text-[rgb(var(--color-text-secondary))]"/>}</div> },
    { key: 'title', title: 'نام', render: (_, row) => <span className="font-semibold">{row.title}</span> },
    { key: 'category_id', title: 'دسته‌بندی', render: (_, row) => <span className="text-[rgb(var(--color-text-secondary))]">{categoryNames.get(row.category_id) || '—'}</span> },
    { key: 'stars_price', title: 'قیمت', render: (_, row) => <b>{row.stars_price.toLocaleString('fa-IR')} ⭐</b> },
    { key: 'delivery_type', title: 'تحویل', render: (_, row) => <Badge variant="purple">{deliveryTypeLabels[row.delivery_type]}</Badge> },
    { key: 'vip_only', title: 'دسترسی', render: (_, row) => row.vip_only ? <Badge variant="amber">VIP</Badge> : <span>عمومی</span> },
    { key: 'repurchasable', title: 'دفعات خرید', render: (_, row) => <Badge variant={row.repurchasable ? 'info' : 'default'}>{row.repurchasable ? 'نامحدود' : 'یک‌بار'}</Badge> },
    { key: 'status', title: 'وضعیت', render: (_, row) => <Badge variant={statusVariants[row.status]} dot>{statusLabels[row.status]}</Badge> },
    { key: 'id', title: 'عملیات', render: (_, row) => <div className="flex items-center gap-1"><button onClick={() => navigate(`/products/${row.id}/edit`)} className="icon-button" title="ویرایش محصول"><Pencil size={15}/></button><button onClick={() => setSelected(row)} className="icon-button text-rose-500 hover:!bg-rose-500/10" title="حذف محصول"><Trash2 size={15}/></button></div> },
  ];

  return <div>
    <PageHeader title="محصولات" action={<Button icon={<Plus size={16}/>} onClick={() => navigate('/products/new')}>محصول جدید</Button>}/>
    <div className="surface-card overflow-hidden"><DataTable columns={columns} data={products} loading={loading} keyExtractor={row => row.id} emptyMessage="هیچ محصولی یافت نشد" pagination={{ page, perPage: PER_PAGE, total, onPageChange: setPage }}/></div>
    <ConfirmationModal isOpen={Boolean(selected)} onClose={() => !deleting && setSelected(null)} onConfirm={() => void remove()} title="حذف محصول" message={selected ? `محصول «${selected.title}» حذف شود؟ این عملیات قابل بازگشت نیست.` : ''} confirmText="حذف محصول" cancelText="انصراف" loading={deleting}/>
  </div>;
}
