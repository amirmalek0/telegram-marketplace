import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { categoriesApi, productsApi } from '@/api';
import { Badge, Button, ConfirmationModal } from '@/components/ui';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogIdentity } from '@/components/catalog/CatalogIdentity';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { CatalogPrices } from '@/components/catalog/CatalogPrices';
import type { Column } from '@/components/ui';
import type { CategoryResponse } from '@/types/categories';
import type { ProductResponse, ProductStatus } from '@/types/products';
import { deliveryTypeLabels, statusLabels } from './productForm';

const PER_PAGE = 20;
const statusVariants: Record<ProductStatus, 'success' | 'info' | 'default'> = { active: 'success', draft: 'info', archived: 'default' };

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ProductResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [productPage, categoryPage] = await Promise.all([
        productsApi.list({ page, per_page: PER_PAGE }),
        categoriesApi.list({ per_page: 200 }),
      ]);
      setProducts(productPage.data);
      setTotal(productPage.total);
      setCategories(categoryPage.data);
    } catch { setLoadError(true); toast.error('خطا در بارگذاری محصولات'); }
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
    { key: 'title', title: 'محصول', render: (_, row) => <CatalogIdentity title={row.title} subtitle={categoryNames.get(row.category_id) || 'دسته‌بندی نامشخص'} image={row.image_url} icon={Package} onClick={() => navigate(`/products/${row.id}/edit`)} /> },
    { key: 'stars_price', title: 'قیمت', render: (_, row) => <CatalogPrices stars={row.stars_price} toman={row.toman_price} /> },
    { key: 'delivery_type', title: 'تحویل', render: (_, row) => <Badge variant="purple">{deliveryTypeLabels[row.delivery_type]}</Badge> },
    { key: 'vip_only', title: 'قوانین خرید', render: (_, row) => <div className="catalog-badges"><Badge variant={row.vip_only ? 'amber' : 'default'}>{row.vip_only ? 'VIP' : 'عمومی'}</Badge><Badge variant="default">{row.repurchasable ? 'خرید مجدد' : 'یک‌بار خرید'}</Badge></div> },
    { key: 'status', title: 'وضعیت', render: (_, row) => <Badge variant={statusVariants[row.status]} dot>{statusLabels[row.status]}</Badge> },
    { key: 'id', title: 'عملیات', render: (_, row) => <div className="flex items-center gap-1"><button onClick={() => navigate(`/products/${row.id}/edit`)} className="icon-button" title="ویرایش محصول"><Pencil size={15}/></button><button onClick={() => setSelected(row)} className="icon-button text-rose-500 hover:!bg-rose-500/10" title="حذف محصول"><Trash2 size={15}/></button></div> },
  ];

  return <div className="catalog-page">
    <CatalogHeader title="محصولات" icon={Package} total={total} loading={loading} actions={<><Button variant="secondary" icon={<BookOpen size={16}/>} onClick={() => navigate('/products/guide')}>راهنمای محصولات</Button><Button icon={<Plus size={16}/>} onClick={() => navigate('/products/new')}>محصول جدید</Button></>}/>
    <CatalogTable columns={columns} data={products} loading={loading} error={loadError} onRefresh={() => void load()} searchText={row => `${row.title} ${categoryNames.get(row.category_id) || ''} ${deliveryTypeLabels[row.delivery_type]}`} filter={{ label: 'همه وضعیت‌ها', options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })), value: row => row.status }} keyExtractor={row => row.id} emptyMessage="هنوز محصولی ثبت نشده است" emptyAction={<Button icon={<Plus size={16} />} onClick={() => navigate('/products/new')}>محصول جدید</Button>} pagination={{ page, perPage: PER_PAGE, total, onPageChange: setPage }}/>
    <ConfirmationModal isOpen={Boolean(selected)} onClose={() => !deleting && setSelected(null)} onConfirm={() => void remove()} title="حذف محصول" message={selected ? `محصول «${selected.title}» حذف شود؟ این عملیات قابل بازگشت نیست.` : ''} confirmText="حذف محصول" cancelText="انصراف" loading={deleting}/>
  </div>;
}
