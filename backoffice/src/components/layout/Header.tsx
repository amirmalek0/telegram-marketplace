import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, Moon, Sun, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { adminsApi } from '@/api';
import { Button, Modal } from '@/components/ui';

const titles: Record<string, string> = {
  '/': 'داشبورد', '/products': 'محصولات', '/categories': 'دسته‌بندی‌ها', '/bundles': 'باندل', '/inventory': 'مخزن', '/files': 'فایل', '/messages': 'پیام تحویل', '/apis': 'اتصال API', '/orders': 'سفارش‌ها', '/payments': 'پرداخت‌ها', '/coupons': 'کدهای تخفیف', '/users': 'کاربران', '/vip': 'پلن‌های VIP', '/tickets': 'تیکت‌ها', '/admins': 'مدیران', '/settings': 'تنظیمات عمومی',
};

function getAdminId(token: string | null) {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { admin_id?: string };
    return payload.admin_id || null;
  } catch {
    return null;
  }
}

export function Header() {
  const { theme, toggleTheme, toggleMobileSidebar } = useUIStore();
  const { accessToken, logout } = useAuthStore();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminName, setAdminName] = useState('مدیر');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const adminId = getAdminId(accessToken);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    const controller = new AbortController();
    adminsApi.getById(adminId, controller.signal)
      .then(admin => setAdminName(admin.username))
      .catch(error => {
        if (error?.code !== 'ERR_CANCELED') setAdminName('مدیر');
      });
    return () => controller.abort();
  }, [adminId]);

  const signOut = () => {
    logout();
    toast.success('از حساب کاربری خارج شدید');
    navigate('/login');
  };

  const resetPassword = async () => {
    if (!adminId) {
      toast.error('شناسه مدیر از نشست فعلی قابل دریافت نیست');
      return;
    }
    if (password.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد');
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error('تکرار رمز عبور یکسان نیست');
      return;
    }

    setSavingPassword(true);
    try {
      await adminsApi.update(adminId, { password });
      toast.success('رمز عبور با موفقیت تغییر کرد');
      setPassword('');
      setPasswordConfirmation('');
      setPasswordModalOpen(false);
    } catch {
      toast.error('تغییر رمز عبور ناموفق بود');
    } finally {
      setSavingPassword(false);
    }
  };

  return <>
    <header className="app-header">
      <div className="flex items-center gap-3">
        <button onClick={toggleMobileSidebar} className="icon-button lg:hidden" aria-label="باز کردن منو"><Menu size={19} /></button>
        <h2 className="text-base font-bold">{titles[pathname] || (pathname === '/products/new' ? 'محصول جدید' : pathname.startsWith('/products/') ? 'ویرایش محصول' : pathname.startsWith('/tickets/') ? 'گفت‌وگوی تیکت' : 'مدیریت')}</h2>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="icon-button" aria-label="تغییر پوسته">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div ref={accountRef} className="relative">
          <button onClick={() => setAccountOpen(open => !open)} className="icon-button border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]" aria-label="حساب مدیر" aria-expanded={accountOpen}><UserRound size={19} /></button>
          {accountOpen && <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1.5 shadow-xl">
            <div className="mb-1.5 flex items-center gap-2.5 border-b border-[rgb(var(--color-border))] px-3 py-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600"><UserRound size={15} /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-medium text-[rgb(var(--color-text-muted))]">حساب مدیر</p>
                <b dir="ltr" className="block truncate text-left text-xs">@{adminName}</b>
              </div>
            </div>
            <button onClick={() => { setAccountOpen(false); setPasswordModalOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-xs font-semibold hover:bg-[rgb(var(--color-surface-2))]"><KeyRound size={15} />تغییر رمز عبور</button>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-right text-xs font-semibold text-rose-500 hover:bg-rose-500/10"><LogOut size={15} />خروج از حساب</button>
          </div>}
        </div>
      </div>
    </header>

    <Modal
      isOpen={passwordModalOpen}
      onClose={() => !savingPassword && setPasswordModalOpen(false)}
      title="تغییر رمز عبور"
      description="رمز جدید حساب مدیر فعلی را وارد کنید"
      size="sm"
      icon={<KeyRound size={18} />}
      footer={<><Button variant="secondary" disabled={savingPassword} onClick={() => setPasswordModalOpen(false)}>انصراف</Button><Button loading={savingPassword} onClick={() => void resetPassword()}>ذخیره رمز جدید</Button></>}
    >
      <div className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold">رمز عبور جدید</span><input type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="حداقل ۸ کاراکتر" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold">تکرار رمز عبور</span><input type="password" autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} className="w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5 text-sm outline-none focus:border-blue-500" placeholder="رمز جدید را دوباره وارد کنید" /></label>
      </div>
    </Modal>
  </>;
}
