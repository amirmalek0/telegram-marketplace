// Development-only visual fixture. No credentials or checkout APIs.
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { ProductPurchasePanel } from '../src/components/catalog/ProductPurchasePanel'
import { VipPlans } from '../src/components/profile/VipPlans'
import { VipCheckoutModal, type VipCheckout } from '../src/components/profile/VipCheckoutModal'
import { WalletSections } from '../src/components/profile/WalletSections'
import { PaymentFlow } from '../src/components/commerce/PaymentFlow'
import { editorAccount, editorVipPlans, editorWallet, editorTopupPacks } from '../src/features/content/editorFixtures'
import '../src/index.css'
if (!import.meta.env.DEV) throw new Error('Local fixture only')
const params = new URLSearchParams(location.search)
document.documentElement.dataset.theme = params.get('theme') || 'light'
function Fixture() {
  const [page, setPage] = useState(params.get('page') || 'product')
  const [checkout,setCheckout] = useState<VipCheckout|null>(null)
  if (params.has('width')) return <iframe title="پیش‌نمایش موبایل" src={'?page='+(params.get('page') || 'product')+'&theme='+(params.get('theme') || 'light')} style={{display:'block',margin:'20px auto',width:Number(params.get('width')),height:650,border:'1px solid #888',borderRadius:20}} />
  return <MemoryRouter><main style={{maxWidth:390,margin:'0 auto',padding:'20px 16px',direction:'rtl',display:'grid',gap:20}}>
    <nav style={{display:'flex',gap:16}}>{['product','vip','wallet','toman'].map(key=><button key={key} onClick={()=>setPage(key)}>{key}</button>)}</nav>
    {page === 'product' && <ProductPurchasePanel targetID="preview-product" stars={125} starsEnabled cardEnabled manualPrice={250000} walletBalance={40} vipFree={false} purchaseLocked={false} purchasing={false} onPurchase={()=>{}} coupon={<button className="coupon-trigger">کد تخفیف دارید؟</button>} />}
    {page === 'vip' && <VipPlans account={editorAccount} walletBalance={editorWallet.balance} plans={editorVipPlans} busyKey={null} starsEnabled onChoose={(plan,method)=>setCheckout({plan,method,quote:{plan_id:plan.id,plan_title:plan.title,original_stars:plan.stars_price,payable_stars:plan.stars_price-20,credit_stars:20,remaining_days:7,is_upgrade:true,current_plan_title:'پلن نقره‌ای',current_tier:1,target_tier:2}})} />}
    {page === 'wallet' && <WalletSections wallet={editorWallet} packs={editorTopupPacks} busyKey={null} onTopup={()=>{}} />}
    {page === 'toman' && <section className="account-checkout-card"><PaymentFlow purpose="wallet_topup" targetID="preview" stars={100} starsEnabled={false} cardEnabled manualPrice={150000} starsAction={null} /></section>}
    {checkout && <VipCheckoutModal checkout={checkout} balance={editorWallet.balance} preview onMethod={method=>setCheckout({...checkout,method})} onClose={()=>setCheckout(null)} onConfirm={()=>{}} />}
  </main></MemoryRouter>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
