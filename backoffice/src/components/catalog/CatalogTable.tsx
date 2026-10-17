import { useEffect, useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search, X, RefreshCw, SearchX, AlertCircle, FolderOpen } from 'lucide-react';
import { DataTable, Button, Select } from '@/components/ui';
import type { Column } from '@/components/ui';
import './catalog.css';

interface Filter<T> { label: string; options: { value: string; label: string }[]; value: (row: T) => string; }
interface Props<T> {
  columns: Column<T>[]; data: T[]; loading: boolean; error?: boolean; onRefresh: () => void;
  keyExtractor: (row: T) => string; searchText: (row: T) => string;
  filter?: Filter<T>; emptyMessage: string; emptyAction?: ReactNode;
  pagination: { page: number; perPage: number; total: number; onPageChange: (page: number) => void };
}
const normalize = (value: string) => value.normalize('NFKC').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).trim().toLocaleLowerCase();

export function CatalogTable<T>({ columns, data, loading, error, onRefresh, keyExtractor, searchText, filter, emptyMessage, emptyAction, pagination }: Props<T>) {
  // Local quick filters deliberately do not change the server pagination or its totals.
  const [query, setQuery] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const scopeId = useId();
  const filtered = data.filter(row => normalize(searchText(row)).includes(normalize(query)) && (!filterValue || !filter || filter.value(row) === filterValue));
  const filtering = Boolean(query.trim() || filterValue);
  const clear = () => { setQuery(''); setFilterValue(''); };
  const { page, perPage, total, onPageChange } = pagination;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const changePage = (next: number) => { clear(); onPageChange(next); };
  useEffect(() => {
    if (!loading && !error && page > pages) onPageChange(pages);
  }, [loading, error, page, pages, onPageChange]);

  return <section className="catalog-list" aria-busy={loading}>
    <div className="catalog-toolbar">
      <div className="catalog-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="جستجو در موارد نمایش‌داده‌شده" aria-describedby={scopeId} value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجوی سریع…" />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="پاک کردن جستجو"><X size={15} /></button>}
      </div>
      {filter && <Select aria-label={filter.label} value={filterValue} onChange={event => setFilterValue(event.target.value)} options={[{ value: '', label: filter.label }, ...filter.options]} className="catalog-filter" />}
      <button className="catalog-refresh" type="button" onClick={onRefresh} disabled={loading} aria-label="تازه‌سازی فهرست" title="تازه‌سازی فهرست"><RefreshCw size={17} aria-hidden="true" /></button>
    </div>
    <div className="catalog-list-caption"><span id={scopeId}>جستجو و فیلتر در موارد نمایش‌داده‌شده</span>{filtering && <button type="button" onClick={clear}>پاک کردن فیلترها <X size={12} /></button>}</div>
    {error && !loading ? <div className="catalog-empty" role="alert"><AlertCircle size={28} /><p>دریافت اطلاعات ناموفق بود</p><Button variant="secondary" onClick={onRefresh}>تلاش دوباره</Button></div>
      : !loading && filtered.length === 0 ? <div className="catalog-empty">{filtering ? <SearchX size={30} /> : <FolderOpen size={30} />}<p>{filtering ? 'موردی با این جستجو یا فیلتر پیدا نشد' : emptyMessage}</p>{filtering ? <Button variant="secondary" onClick={clear}>نمایش همه موارد</Button> : emptyAction}</div>
      : <div className="catalog-table"><DataTable columns={columns} data={filtered} loading={loading} keyExtractor={keyExtractor} /></div>}
    <footer className="catalog-pagination">
      <span aria-live="polite">{loading ? 'در حال دریافت…' : error ? 'اطلاعات در دسترس نیست' : filtering ? `${filtered.length.toLocaleString('fa-IR')} نتیجه از ${data.length.toLocaleString('fa-IR')} مورد دریافت‌شده` : `${total.toLocaleString('fa-IR')} مورد · صفحه ${page.toLocaleString('fa-IR')} از ${pages.toLocaleString('fa-IR')}`}</span>
      {pages > 1 && <nav aria-label="صفحه‌بندی فهرست">
        <button type="button" aria-label="صفحه قبل" disabled={loading || page <= 1} onClick={() => changePage(page - 1)}><ChevronRight size={16} /></button>
        {Array.from({ length: Math.min(5, pages) }, (_, index) => start + index).map(number => <button type="button" key={number} disabled={loading} aria-label={`صفحه ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => changePage(number)}>{number.toLocaleString('fa-IR')}</button>)}
        <button type="button" aria-label="صفحه بعد" disabled={loading || page >= pages} onClick={() => changePage(page + 1)}><ChevronLeft size={16} /></button>
      </nav>}
    </footer>
  </section>;
}
