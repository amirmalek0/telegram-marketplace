// Development-only captures of production components using synthetic, read-only data.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '../src/api/client';
import { Sidebar } from '../src/components/layout/Sidebar';
import InventoryPage from '../src/pages/inventory/InventoryPage';
import FilesPage from '../src/pages/files/FilesPage';
import MessagesPage from '../src/pages/messages/MessagesPage';
import BundlesPage from '../src/pages/bundles/BundlesPage';
import APIsPage from '../src/pages/apis/APIsPage';
import ProductEditorPage from '../src/pages/products/ProductEditorPage';
import '../src/styles/globals.css';

if (!import.meta.env.DEV) throw new Error('Local screenshot fixture only');
document.documentElement.classList.remove('dark');
const created_at = '2026-10-30T08:00:00Z';
const data = {
  '/inventory': [{ id: 'guide-inventory', name: 'لایسنس‌های یک‌ماهه', created_at }],
  '/file': [{ id: 'guide-file', name: 'کتاب آموزش طراحی.pdf', size: 204800, mime_type: 'application/pdf', created_at }],
  '/message': [{ id: 'guide-message', name: 'راهنمای فعال‌سازی', content: 'راهنمای استفاده از محصول', created_at }],
  '/bundle': [],
  '/api': [],
  '/category': [{ id: 'guide-category', title: 'آموزش و ابزار', active: true, sort_order: 1, created_at }],
};
apiClient.defaults.adapter = async config => {
  if (config.method?.toLowerCase() !== 'get') throw new Error('Screenshot fixtures cannot write data');
  const path = config.url || '';
  let result: unknown;
  if (path === '/inventory/guide-inventory/item') {
    result = ['available', 'reserved', 'sold'].map((status, index) => ({ id: `item-${index}`, inventory_id: 'guide-inventory', value: `LICENSE-EXAMPLE-00${index + 1}`, status, created_at }));
  } else if (path in data) {
    const rows = data[path as keyof typeof data];
    result = { data: rows, total: rows.length, page: 1, per_page: 20, total_pages: 1 };
  } else throw new Error(`Unmocked screenshot request: ${path}`);
  return { data: result, status: 200, statusText: 'OK', headers: {}, config };
};
const pages = { inventory: InventoryPage, file: FilesPage, message: MessagesPage, bundle: BundlesPage, api: APIsPage, product: ProductEditorPage };
const routes = { inventory: '/inventory', file: '/files', message: '/messages', bundle: '/bundles', api: '/apis', product: '/products/new' };
const requested = new URLSearchParams(location.search).get('type') || 'product';
const kind = requested in pages ? requested as keyof typeof pages : 'product';
const Page = pages[kind];
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={[routes[kind]]}>
  <Sidebar/>
  <div style={{marginRight:280, minHeight:'100vh'}}>
    <header style={{height:76,padding:'20px 32px',borderBottom:'1px solid rgb(var(--color-border))',background:'rgb(var(--color-surface))',fontWeight:700}}>پنل مدیریت · کاتالوگ محصولات</header>
    <main style={{padding:32}}><Page/></main>
  </div>
</MemoryRouter>);
