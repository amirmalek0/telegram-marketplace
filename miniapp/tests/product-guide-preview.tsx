// Development-only screenshots of real delivery components. No API, authentication or payments.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { DeliveryCard } from '../src/components/commerce/DeliveryCard'
import type { DeliveryItem } from '../src/features/commerce/types'
import '../src/index.css'
if (!import.meta.env.DEV) throw new Error('Local screenshot fixture only')
document.documentElement.dataset.theme = 'light'
const examples: Record<string, { title: string; items: DeliveryItem[] }> = {
  file: { title: 'کتاب آموزش طراحی و تمرین', items: [{ kind: 'file', label: 'کتاب آموزش طراحی.pdf', download_url: '#example-only' }, { kind: 'file', label: 'فایل تمرین.zip', download_url: '#example-only' }] },
  message: { title: 'راهنمای فعال‌سازی', items: [{ kind: 'message', label: 'اطلاعات محصول', content: 'از خرید شما سپاسگزاریم.\nبرای شروع، راهنمای فعال‌سازی را بخوانید.\nدر صورت نیاز از بخش تیکت‌ها کمک بگیرید.' }] },
  inventory: { title: 'لایسنس یک‌ماهه', items: [{ kind: 'inventory', label: 'اطلاعات اختصاصی', content: 'کد آموزشی: SAMPLE-NOT-VALID\nاین کد صرفاً برای نمایش رابط کاربری است.' }] },
  bundle: { title: 'بسته نرم‌افزار و فعال‌سازی', items: [{ kind: 'file', label: 'فایل نصب.zip', download_url: '#example-only' }, { kind: 'message', label: 'اطلاعات محصول', content: 'فایل را دریافت کنید؛ سپس کد را در بخش فعال‌سازی وارد کنید.' }, { kind: 'inventory', label: 'اطلاعات اختصاصی', content: 'SAMPLE-NOT-VALID\nکد آموزشی و غیرقابل استفاده' }] },
  api: { title: 'صدور کد فعال‌سازی', items: [{ kind: 'api', label: 'صدور کد فعال‌سازی', content: 'SAMPLE-API-RESULT\nنمونه نتیجه سرویس؛ غیرقابل استفاده' }] },
}
const kind = new URLSearchParams(location.search).get('type') || 'file'
const example = examples[kind] || examples.file
createRoot(document.getElementById('root')!).render(<main id="guide-delivery" style={{width:960,maxWidth:'calc(100% - 64px)',margin:'40px auto',padding:32,direction:'rtl',background:'var(--bg)',borderRadius:24,border:'1px solid var(--line)'}} onClick={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault() }}>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}><h1 style={{fontSize:18}}>دانلودها و محتوای خرید</h1><small style={{fontSize:11}}>نمونه آموزشی</small></div>
  <DeliveryCard delivery={{ order_id:'guide', product_id:'guide', product_title:example.title, created_at:'2026-10-30T08:00:00Z', status:'delivered', items:example.items }} />
  {kind !== 'bundle' && <p style={{fontSize:12,lineHeight:1.9,marginTop:20,opacity:.7}}>مسیر دریافت: پروفایل ← دانلودها<br/>یا صفحه محصول ← دسترسی‌های شما</p>}
</main>)
