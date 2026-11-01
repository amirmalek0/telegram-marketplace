import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronLeft, FileArchive, Layers3, MessageSquareText, PackagePlus, ShieldCheck, Warehouse, Webhook } from 'lucide-react';
import { Modal } from '@/components/ui';
import { productGuides } from './productGuides';
import { GuideFigure, guideImageUrl, type GuideScreenshot } from './GuideFigure';
import { GuidePath, GuidePoints } from './GuideText';
import { APIResponseGuide } from './APIResponseGuide';
import './product-guide.css';

const icons = { file: FileArchive, message: MessageSquareText, inventory: Warehouse, bundle: Layers3, api: Webhook };

export default function ProductGuidePage() {
  const [zoom, setZoom] = useState<GuideScreenshot | null>(null);
  const { hash } = useLocation();
  useEffect(() => {
    const id = hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [hash]);
  return <div className="product-guide" dir="rtl">
    <header className="product-guide-header">
      <div><Link to="/products" className="product-guide-back"><ArrowRight size={16} /> محصولات</Link><h1><BookOpen size={25} /> راهنمای محصولات</h1><p>از انتخاب نوع محصول تا تحویل به مشتری؛ قدم‌به‌قدم و بدون اصطلاحات پیچیده.</p></div>
      <Link to="/products/new" className="product-guide-create"><PackagePlus size={18} /> ساخت محصول</Link>
    </header>
    <div className="product-guide-layout">
      <aside className="product-guide-index"><nav aria-label="فهرست راهنمای محصولات"><strong>در این راهنما</strong>
        <Link to="#start" aria-current={hash === '#start' ? 'location' : undefined}>پیش از شروع <ChevronLeft size={14}/></Link>
        {productGuides.map(guide => { const Icon = icons[guide.id]; return <Link to={`#${guide.id}`} key={guide.id} aria-current={hash === `#${guide.id}` ? 'location' : undefined}><Icon size={17}/><span>{guide.title}</span><ChevronLeft size={14}/></Link>; })}
        <Link to="#delivery" aria-current={hash === '#delivery' ? 'location' : undefined}>پرداخت و دریافت <ChevronLeft size={14}/></Link>
        <Link to="#checklist" aria-current={hash === '#checklist' ? 'location' : undefined}>چک‌لیست انتشار <ChevronLeft size={14}/></Link>
      </nav></aside>
      <main className="product-guide-articles">
        <section id="start" className="product-guide-section">
          <h2>چه چیزی به مشتری می‌فروشید؟</h2>
          <GuidePoints text="«محصول» همان چیزی است که در فروشگاه با عنوان، تصویر و قیمت دیده می‌شود. «منبع تحویل» محتوایی است که پس از خرید به مشتری می‌رسد. ابتدا منبع را آماده کنید، سپس آن را در صفحه محصول انتخاب کنید." />
          <div className="product-guide-choices">{productGuides.map(guide => { const Icon = icons[guide.id]; return <Link key={guide.id} to={`#${guide.id}`}><Icon size={22}/><span><b>{guide.title}</b><small>{guide.summary}</small></span><ChevronLeft size={16}/></Link>; })}</div>
          <h3>بخش‌های مشترک ساخت محصول</h3>
          <ul className="product-guide-points">
            <li>از <GuidePath>محصولات ← محصول جدید</GuidePath> وارد فرم ساخت محصول شوید.</li>
            <li><b>عنوان:</b> نام روشن و قابل فهمی برای محصول بنویسید.</li>
            <li><b>توضیحات:</b> محتوای محصول و شرایط استفاده را توضیح دهید.</li>
            <li><b>دسته‌بندی:</b> دسته مرتبط را انتخاب کنید.</li>
            <li><b>تصویر اصلی:</b> تصویر محصول الزامی است؛ تصویر با فایل قابل فروش تفاوت دارد.</li>
            <li><b>قیمت:</b> قیمت (Stars) و در صورت ارائه، قیمت (تومان) را تعیین کنید.</li>
            <li><b>تحویل:</b> روش تحویل و منبع مربوط به آن را انتخاب کنید.</li>
            <li><b>پرداخت:</b> محصول از تنظیمات عمومی پیروی می‌کند؛ برای استثنا، <GuidePath>روش‌های اختصاصی این محصول</GuidePath> را روشن کنید.</li>
            <li><b>خرید مجدد:</b> این گزینه امکان خرید دوباره توسط همان کاربر را کنترل می‌کند.</li>
            <li><b>محصول ویژه VIP:</b> کاربر دارای اشتراک فعال می‌تواند این محصول را رایگان دریافت کند.</li>
          </ul>
          <GuideFigure onZoom={setZoom} name="product-form" caption="بخش اطلاعات اصلی در صفحه ساخت محصول." />
          <GuideFigure onZoom={setZoom} name="product-delivery" caption="بخش تحویل محصول؛ روش تحویل را انتخاب و منبع مربوط به آن را مشخص کنید." />
          <div className="product-guide-note"><ShieldCheck size={20}/><p>ظاهر مینی‌اپ شما ممکن است با توجه به پوسته انتخاب‌شده متفاوت باشد.</p></div>
        </section>
        {productGuides.map(guide => { const Icon = icons[guide.id]; return <article id={guide.id} className="product-guide-section" key={guide.id} aria-labelledby={`title-${guide.id}`}>
          <header className="product-guide-article-heading"><span><Icon size={24}/></span><div><h2 id={`title-${guide.id}`}>{guide.title}</h2><p>{guide.summary}</p></div></header>
          <GuidePoints text={guide.explanation}/><div className="product-guide-example"><b>یک مثال ساده</b><p>{guide.example}</p></div>
          <h3>چطور این محصول را بسازم؟</h3>
          <ol className="product-guide-steps">{guide.steps.map((step, index) => <li key={step.title}><span>{(index + 1).toLocaleString('fa-IR')}</span><div><h4>{step.title}</h4><GuidePoints text={step.body}/></div></li>)}</ol>
          <GuideFigure onZoom={setZoom} name={`${guide.id}-setup`} caption={guide.setupCaption}/>
          {guide.id === 'inventory' && <GuideFigure onZoom={setZoom} name="inventory-items" caption="مدیریت آیتم‌های مخزن؛ ورود هر آیتم در یک خط و مشاهده وضعیت موجود، رزروشده و فروخته‌شده."/>}
          {guide.id === 'api' && <APIResponseGuide/>}
          <Link className="product-guide-resource" to={guide.resourcePath}>{guide.resourceLabel}<ChevronLeft size={16}/></Link>
          <h3>مشتری چه چیزی دریافت می‌کند؟</h3><GuidePoints text={guide.delivery}/>
          <GuideFigure onZoom={setZoom} name={`${guide.id}-delivery`} caption={`تحویل ${guide.title} در مینی‌اپ.`}/>
          {guide.caution && <div className="product-guide-caution"><b>قبل از فروش بدانید</b><GuidePoints text={guide.caution}/></div>}
        </article>; })}
        <section id="delivery" className="product-guide-section"><h2>چه زمانی تحویل انجام می‌شود؟</h2>
          <ul className="product-guide-list"><li><b>Stars یا کیف پول:</b> پس از تأیید موفق پرداخت توسط سیستم، محتوای خرید قابل دریافت می‌شود؛ بسته شدن پنجره پرداخت به‌تنهایی نشانه موفقیت نیست.</li><li><b>کارت‌به‌کارت:</b> ارسال رسید یا شماره تراکنش، فقط درخواست بررسی است. تحویل پس از تأیید مدیر انجام می‌شود؛ تا آن زمان مشتری در انتظار بررسی می‌ماند.</li><li><b>محصول ویژه VIP:</b> کاربر دارای اشتراک فعال می‌تواند محتوای محصول علامت‌خورده را از گزینه دریافت مربوط به VIP بگیرد.</li><li><b>حالت آزمایشی:</b> موفقیت شبیه‌ساز Stars مسیر واقعی تسویه را اجرا می‌کند و می‌تواند محصول را تحویل دهد، موجودی مصرف کند یا کیف پول و VIP را تغییر دهد. تست کارت‌به‌کارت حق دسترسی واقعی نمی‌دهد. هر دو را در محیط جدا آزمایش کنید؛ پیش‌نمایش ویرایشگر نیز فقط آموزشی است.</li></ul>
          <h3>محتوای خرید کجاست؟</h3><GuidePoints text="در مینی‌اپ، مشتری می‌تواند از «صفحه محصول ← دسترسی‌های شما» یا «پروفایل ← دانلودها» محتوای تحویل را ببیند. بخش دانلودها فقط برای فایل نیست؛ پیام، موجودی و نتیجه API هم در کارت تحویل نمایش داده می‌شوند. برای پیگیری وضعیت خرید نیز «پروفایل ← سفارش‌ها» در دسترس است."/>
          <GuidePoints text="اعلان داخل ربات را با خودِ محتوای تحویل یکی ندانید؛ مسیر دریافت محتوای این راهنما، مینی‌اپ است. در تحویل API، آماده‌سازی ممکن است زمان ببرد. در صورت خطا، ابتدا وضعیت پرداخت و تحویل سفارش را بررسی کنید و از مشتری نخواهید دوباره برای همان خرید پرداخت کند."/>
        </section>
        <section id="checklist" className="product-guide-section"><h2>پیش از انتشار بررسی کنید</h2><ul className="product-guide-checklist">{['دسته‌بندی، عنوان، توضیحات و تصویر اصلی درست هستند.', 'نوع تحویل با چیزی که می‌فروشید مطابقت دارد و منبع انتخاب شده است.', 'فایل و لینک‌ها معتبرند؛ متن پیام ثابت، اطلاعات اختصاصی مشتری نیست.', 'مخزن یا باندل دارای مخزن، موجودی کافی دارد.', 'قیمت‌ها و روش‌های پرداخت مورد نظر فعال و درست تنظیم شده‌اند.', 'خرید مجدد و دسترسی VIP مطابق سیاست فروشگاه تنظیم شده‌اند.', 'در ویرایش محصول، وضعیت نمایش را بررسی کرده‌اید و اتصال API را بدون افشای اطلاعات حساس آزموده‌اید.'].map(text => <li key={text}><Check size={17}/><span>{text}</span></li>)}</ul><Link to="/products/new" className="product-guide-create"><PackagePlus size={18}/> آماده‌ام؛ ساخت محصول</Link></section>
      </main>
    </div>
    <Modal isOpen={Boolean(zoom)} onClose={() => setZoom(null)} title="نمای بزرگ تصویر راهنما" size="xl" className="product-guide-lightbox">{zoom && <figure><img src={guideImageUrl(zoom.name)} alt={zoom.caption}/><figcaption>{zoom.caption}</figcaption></figure>}</Modal>
  </div>;
}
