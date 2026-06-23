import { motion } from 'framer-motion';
import {
  Package, Tag, FileText, MessageSquare,
  Archive, Layers, Code, Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatCard {
  label: string;
  icon: React.ElementType;
  color: string;
  path: string;
  description: string;
}

const stats: StatCard[] = [
  { label: 'دسته‌بندی‌ها', icon: Tag, color: 'from-blue-500 to-cyan-500', path: '/categories', description: 'مدیریت دسته‌بندی محصولات' },
  { label: 'محصولات', icon: Package, color: 'from-purple-500 to-pink-500', path: '/products', description: 'مدیریت محصولات فروشگاه' },
  { label: 'فایل‌ها', icon: FileText, color: 'from-green-500 to-emerald-500', path: '/files', description: 'مدیریت فایل‌های آپلود شده' },
  { label: 'پیام‌ها', icon: MessageSquare, color: 'from-yellow-500 to-orange-500', path: '/messages', description: 'مدیریت پیام‌های تحویل' },
  { label: 'موجودی‌ها', icon: Archive, color: 'from-red-500 to-rose-500', path: '/inventory', description: 'مدیریت موجودی محصولات' },
  { label: 'بسته‌ها', icon: Layers, color: 'from-indigo-500 to-violet-500', path: '/bundles', description: 'مدیریت بسته‌های ترکیبی' },
  { label: 'APIها', icon: Code, color: 'from-pink-500 to-fuchsia-500', path: '/apis', description: 'مدیریت APIهای خارجی' },
  { label: 'مدیران', icon: Users, color: 'from-teal-500 to-cyan-500', path: '/admins', description: 'مدیریت حساب‌های ادمین' },
];

function NavCard({ stat, index }: { stat: StatCard; index: number }) {
  const navigate = useNavigate();
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(stat.path)}
      className="glass-card rounded-2xl p-6 cursor-pointer group transition-shadow hover:shadow-xl"
    >
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-200`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <h3 className="font-semibold text-[rgb(var(--color-text))] mb-1">{stat.label}</h3>
      <p className="text-sm text-[rgb(var(--color-text-secondary))]">{stat.description}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 bg-gradient-to-br from-[#0088cc]/10 to-[#00b4d8]/5"
      >
        <h1 className="text-3xl font-bold text-[rgb(var(--color-text))] mb-2">
          داشبورد مدیریت
        </h1>
        <p className="text-[rgb(var(--color-text-secondary))]">
          خوش آمدید به پنل مدیریت ربات تلگرام. از منوی زیر به بخش مورد نظر دسترسی داشته باشید.
        </p>
      </motion.div>

      {/* Navigation Cards Grid */}
      <div>
        <h2 className="text-lg font-semibold text-[rgb(var(--color-text))] mb-4">بخش‌های مدیریتی</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <NavCard key={stat.path} stat={stat} index={index} />
          ))}
        </div>
      </div>

      {/* Footer info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-[rgb(var(--color-text-secondary))] py-4"
      >
        پنل مدیریت ربات تلگرام | نسخه ۱.۰.۰
      </motion.div>
    </div>
  );
}
