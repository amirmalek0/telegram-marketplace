// Development-only visual fixture. Preview actions never call payment APIs.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ManualCheckout } from '../src/components/commerce/manual/ManualCheckout'
import { PaymentResultModal } from '../src/components/commerce/PaymentResultModal'
import { manualPreviewPayment, type ManualPurpose } from '../src/features/content/manualPreview'
import '../src/index.css'

if (!import.meta.env.DEV) throw new Error('Local fixture only')
const params = new URLSearchParams(location.search)
const states = ['awaiting_proof', 'receipt', 'submitted', 'approved', 'rejected', 'cancelled', 'error', 'submitting', 'cancel-confirm', 'test', 'upgrade']
function Fixture() {
  const [state, setState] = useState(params.get('state') || 'awaiting_proof')
  const [theme, setTheme] = useState(params.get('theme') || 'light')
  const [purpose, setPurpose] = useState<ManualPurpose>('wallet_topup')
  const [width, setWidth] = useState('390')
  const [open, setOpen] = useState(true)
  if (params.has('frame')) {
    document.documentElement.dataset.theme = params.get('theme') || 'light'
    return open ? params.get('result') ? <PaymentResultModal result={{kind:'success', title:'پرداخت با موفقیت انجام شد',message:'اعتبار خریداری‌شده به کیف پول شما اضافه شد.'}} onClose={() => setOpen(false)} /> : <ManualCheckout key={state} preview previewState={state} initial={manualPreviewPayment((params.get('purpose') || 'wallet_topup') as ManualPurpose, state)} initDataRaw="" onClose={() => setOpen(false)} /> : <button onClick={() => setOpen(true)}>باز کردن دوباره</button>
  }
  return <div style={{display:'grid',placeItems:'center',gap:16,padding:16,direction:'rtl'}}>
    <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
      <label>وضعیت <select value={state} onChange={e => setState(e.target.value)}>{states.map(value => <option key={value}>{value}</option>)}</select></label>
      <label>پوسته <select value={theme} onChange={e => setTheme(e.target.value)}><option>light</option><option>dark</option></select></label>
      <label>خرید <select value={purpose} onChange={e => setPurpose(e.target.value as ManualPurpose)}><option>product</option><option>wallet_topup</option><option>vip_plan</option></select></label>
      <label>عرض <select value={width} onChange={e => setWidth(e.target.value)}><option>320</option><option>390</option><option>480</option></select></label>
    </div>
    <iframe title="پیش‌نمایش پرداخت موبایل" key={state+theme+purpose} src={'?frame=1&state='+state+'&theme='+theme+'&purpose='+purpose} style={{width:Number(width),height:620,border:'1px solid #bbb',borderRadius:24}} />
  </div>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
