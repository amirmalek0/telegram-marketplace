import { useEffect, useState } from 'react';
import { Check, LayoutTemplate, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui';
import { categoryDesigns, productDesigns, defaultShopDesigns, parseShopDesigns, shopDesignsKey, type ShopDesigns } from './shopDesigns';
import './shop-design-editor.css';

const categoryLabels = {
  ribbon: ['نوار رنگی', 'کارت‌های افقی با رنگ‌های زنده'],
  grid: ['شبکه مرتب', 'دو ستون با آیکون کنار عنوان'],
  pills: ['کپسولی', 'دکمه‌های گرد در یک ردیف افقی'],
  list: ['فهرست یکپارچه', 'ردیف‌های منظم در یک قاب'],
  tiles: ['کاشی تصویری', 'آیکون بزرگ و عنوان در پایین'],
};
const productLabels = {
  list: ['کارت افقی', 'تصویر در راست و جزئیات در چپ'],
  grid: ['ویترین دو ستونه', 'کارت‌های تصویری کنار یکدیگر'],
  featured: ['نمای تمام‌عرض', 'تصویر عریض و جزئیات برجسته'],
  compact: ['فهرست فشرده', 'تصویر کوچک با ردیف‌های پیوسته'],
  carousel: ['گالری ورق‌زدنی', 'کارت‌های افقی با حرکت انگشت'],
};

function DesignPreview({ section, design }: { section: keyof ShopDesigns; design: string }) {
  return <span className={`shop-design-thumbnail ${section}-thumbnail design-${design}`} aria-hidden="true">
    {[0, 1, 2, 3].map(item => <span className="design-sample" key={item}><i /><span><b /><b /><em /></span></span>)}
  </span>;
}

export function ShopDesignEditor({ onPreview, onOpenShop }: { onPreview: (designs: ShopDesigns) => void; onOpenShop: () => void }) {
  const [draft, setDraft] = useState(defaultShopDesigns);
  const [saved, setSaved] = useState(defaultShopDesigns);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const dirty = draft.categories !== saved.categories || draft.products !== saved.products;
  useEffect(() => {
    let active = true;
    setError(false);
    apiClient.get<{ data: Record<string, string> }>('/miniapp-content').then(({ data }) => {
      if (!active) return;
      const designs = parseShopDesigns(data.data[shopDesignsKey]) ?? { ...defaultShopDesigns };
      setDraft(designs); setSaved(designs); setLoaded(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { if (loaded) onPreview(draft); }, [draft, loaded, onPreview]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async () => {
    if (!loaded || !dirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/miniapp-content/${shopDesignsKey}`, { value: JSON.stringify(draft) });
      setSaved({ ...draft }); toast.success('طرح بخش‌های فروشگاه ذخیره شد');
    } catch { toast.error('ذخیره طرح‌ها ناموفق بود؛ دوباره تلاش کنید'); }
    finally { setSaving(false); }
  };
  const choose = <K extends keyof ShopDesigns>(section: K, design: ShopDesigns[K]) => {
    setDraft(current => ({ ...current, [section]: design }));
    onOpenShop();
  };
  return <section className="palette-editor" aria-label="طرح بخش‌های فروشگاه">
    <div className="palette-editor-heading"><LayoutTemplate size={19} /><h2>طرح بخش‌های فروشگاه</h2>{loaded && <span className={`palette-state ${dirty ? 'is-dirty' : ''}`} role="status">{dirty ? 'ذخیره نشده' : 'ذخیره‌شده'}</span>}</div>
    <div className="palette-scroll">
      <p className="palette-custom-note">برای هر بخش یک طرح مستقل انتخاب کنید؛ رنگ‌ها از پالت فعلی گرفته می‌شوند. تغییرات فقط در صفحه فروشگاه اعمال می‌شوند.</p>
      {error ? <div className="palette-load-state" role="alert">دریافت طرح‌ها ناموفق بود. <button type="button" onClick={() => setAttempt(value => value + 1)}>تلاش دوباره</button></div> : !loaded ? <p role="status">در حال دریافت طرح‌ها…</p> : <>
        <fieldset className="shop-design-group" disabled={saving}><legend>دسته‌بندی‌ها <small>۵ طرح</small></legend>
          <div className="shop-design-options">{categoryDesigns.map(design => <button type="button" key={design} aria-pressed={draft.categories === design} onClick={() => choose('categories', design)}>
            <DesignPreview section="categories" design={design} />
            <span className="shop-design-name">{categoryLabels[design][0]}{draft.categories === design && <Check size={15} />}</span><small>{categoryLabels[design][1]}</small>
          </button>)}</div>
        </fieldset>
        <fieldset className="shop-design-group" disabled={saving}><legend>محصولات <small>۵ طرح</small></legend>
          <div className="shop-design-options">{productDesigns.map(design => <button type="button" key={design} aria-pressed={draft.products === design} onClick={() => choose('products', design)}>
            <DesignPreview section="products" design={design} />
            <span className="shop-design-name">{productLabels[design][0]}{draft.products === design && <Check size={15} />}</span><small>{productLabels[design][1]}</small>
          </button>)}</div>
        </fieldset>
        <button type="button" className="palette-reset" disabled={saving} onClick={() => { setDraft({ ...defaultShopDesigns }); onOpenShop(); }}><RotateCcw size={14} /> بازگشت به طرح‌های پیش‌فرض</button>
      </>}
    </div>
    <footer className="palette-footer"><p>طرح‌ها تا زدن «ذخیره طرح‌ها» فقط در پیش‌نمایش تغییر می‌کنند.</p><div>
      <Button size="sm" icon={<Save size={14} />} disabled={!loaded || !dirty || saving} onClick={save}>{saving ? 'در حال ذخیره…' : 'ذخیره طرح‌ها'}</Button>
      <Button size="sm" variant="secondary" disabled={!dirty || saving} onClick={() => { setDraft({ ...saved }); onOpenShop(); }}>لغو طرح‌ها</Button>
    </div></footer>
  </section>;
}
