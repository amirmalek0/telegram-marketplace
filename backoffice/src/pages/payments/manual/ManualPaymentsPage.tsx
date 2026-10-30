import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpLeft, CreditCard, Inbox, MessageSquare, WalletCards } from 'lucide-react';
import { ManualCardsSettings } from './ManualCardsSettings';
import { ManualReview } from './ManualReview';
import './manual-payments.css';

const tabs = [
  { key: 'reviews', title: 'بررسی واریزها', icon: Inbox },
  { key: 'cards', title: 'کارت‌ها و تنظیمات', icon: WalletCards },
  { key: 'messages', title: 'پیام‌های مشتری', icon: MessageSquare },
] as const;

export default function ManualPaymentsPage() {
  const [tab, setTab] = useState<'reviews' | 'cards' | 'messages'>('reviews');
  return <div className="finance-page manual-admin">
    <header className="manual-page-heading">
      <div><span className="manual-heading-icon"><CreditCard size={24} /></span><h1>کارت‌به‌کارت</h1></div>
      <Link to="/payments">پرداخت‌های Stars<ArrowUpLeft size={16} /></Link>
    </header>
    <nav className="manual-tabs" aria-label="مدیریت کارت‌به‌کارت">
      {tabs.map(({ key, title, icon: Icon }) => <button type="button" key={key} aria-pressed={key === tab} aria-controls={key === 'reviews' ? 'manual-reviews-panel' : 'manual-config-panel'} onClick={() => setTab(key)}><Icon size={18} /><span>{title}</span></button>)}
    </nav>
    <div id="manual-reviews-panel" hidden={tab !== 'reviews'}><ManualReview /></div>
    <div id="manual-config-panel" hidden={tab === 'reviews'}><ManualCardsSettings section={tab === 'messages' ? 'messages' : 'cards'} /></div>
  </div>;
}
