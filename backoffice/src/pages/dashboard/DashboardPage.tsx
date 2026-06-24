import { motion } from 'framer-motion';
import {
  Package, Tag, FileText, MessageSquare,
  Archive, Layers, Code, Users,
  ArrowLeft, Sparkles, TrendingUp, Activity,
  ShoppingCart, Shield,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavCard {
  label: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  glow: string;
  path: string;
  tag?: string;
}

const primaryCards: NavCard[] = [
  {
    label: 'محصولات',
    description: 'مدیریت کامل محصولات فروشگاه',
    icon: Package,
    gradient: 'from-violet-500 via-purple-500 to-indigo-600',
    glow: 'shadow-violet-500/25',
    path: '/products',
    tag: 'فروشگاه',
  },
  {
    label: 'دسته‌بندی‌ها',
    description: 'سازماندهی و مرتب‌سازی دسته‌ها',
    icon: Tag,
    gradient: 'from-sky-500 via-blue-500 to-cyan-600',
    glow: 'shadow-sky-500/25',
    path: '/categories',
    tag: 'فروشگاه',
  },
  {
    label: 'سفارش‌ها',
    description: 'پیگیری و مدیریت سفارشات',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 via-green-500 to-teal-600',
    glow: 'shadow-emerald-500/25',
    path: '/orders',
    tag: 'تجارت',
  },
  {
    label: 'مدیران',
    description: 'کنترل دسترسی و حساب‌های ادمین',
    icon: Shield,
    gradient: 'from-rose-500 via-red-500 to-pink-600',
    glow: 'shadow-rose-500/25',
    path: '/admins',
    tag: 'کاربران',
  },
];

const secondaryCards: NavCard[] = [
  {
    label: 'فایل‌ها',
    description: 'آپلود و مدیریت فایل‌ها',
    icon: FileText,
    gradient: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-500/20',
    path: '/files',
  },
  {
    label: 'پیام‌ها',
    description: 'پیام‌های تحویل محصول',
    icon: MessageSquare,
    gradient: 'from-cyan-500 to-blue-500',
    glow: 'shadow-cyan-500/20',
    path: '/messages',
  },
  {
    label: 'مخزن‌ها',
    description: 'مدیریت مخزن و آیتم‌ها',
    icon: Archive,
    gradient: 'from-fuchsia-500 to-purple-500',
    glow: 'shadow-fuchsia-500/20',
    path: '/inventory',
  },
  {
    label: 'باندل‌ها',
    description: 'بسته‌های ترکیبی محصولات',
    icon: Layers,
    gradient: 'from-teal-500 to-emerald-500',
    glow: 'shadow-teal-500/20',
    path: '/bundles',
  },
  {
    label: 'API‌ها',
    description: 'اتصال به سرویس‌های خارجی',
    icon: Code,
    gradient: 'from-slate-500 to-gray-600',
    glow: 'shadow-slate-500/20',
    path: '/apis',
  },
  {
    label: 'کاربران',
    description: 'مدیریت کاربران ربات',
    icon: Users,
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'shadow-indigo-500/20',
    path: '/users',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24 },
  },
};

function PrimaryCard({ card }: { card: NavCard }) {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(card.path)}
      className={`relative overflow-hidden rounded-2xl cursor-pointer group shadow-xl ${card.glow}`}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-90`} />

      {/* Noise texture */}
      <div className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative circle */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10 blur-lg" />

      {/* Content */}
      <div className="relative p-6">
        {card.tag && (
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full mb-3">
            {card.tag}
          </span>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{card.label}</h3>
            <p className="text-sm text-white/70">{card.description}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
            <card.icon size={22} className="text-white" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-4 text-white/60 text-xs group-hover:text-white/90 transition-colors">
          <span>مشاهده</span>
          <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}

function SecondaryCard({ card }: { card: NavCard }) {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(card.path)}
      className="card p-5 cursor-pointer group hover:border-[rgb(var(--color-primary))]/30 transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg ${card.glow} group-hover:scale-110 transition-transform duration-200`}>
          <card.icon size={19} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[rgb(var(--color-text))] text-sm">{card.label}</h4>
          <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5 truncate">{card.description}</p>
        </div>
        <ArrowLeft size={14} className="text-[rgb(var(--color-text-muted))] group-hover:text-[rgb(var(--color-primary))] group-hover:-translate-x-1 transition-all flex-shrink-0" />
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8 pb-8">

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(135deg, #0088cc 0%, #0055aa 50%, #003388 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/5 blur-2xl translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-[#00c6ff]/20 blur-2xl" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative px-8 py-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="text-white/70 text-sm">پنل مدیریت ربات تلگرام</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 leading-tight">
              خوش آمدید 👋
            </h1>
            <p className="text-white/60 text-sm max-w-md">
              از اینجا می‌توانید تمام بخش‌های ربات تلگرام خود را مدیریت کنید.
            </p>
          </div>

          {/* Stats pills */}
          <div className="hidden lg:flex flex-col gap-3">
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">وضعیت سیستم</p>
                <p className="text-white font-semibold text-sm">آنلاین</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-400 mr-1 pulse-dot" />
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity size={15} className="text-white" />
              </div>
              <div>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">نسخه</p>
                <p className="text-white font-semibold text-sm">۱.۰.۰</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Primary Cards */}
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#0088cc] to-[#00c6ff]" />
          <h2 className="text-base font-bold text-[rgb(var(--color-text))]">بخش‌های اصلی</h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {primaryCards.map((card) => (
            <PrimaryCard key={card.path} card={card} />
          ))}
        </motion.div>
      </div>

      {/* Secondary Cards */}
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[rgb(var(--color-text-muted))] to-[rgb(var(--color-border))]" />
          <h2 className="text-base font-bold text-[rgb(var(--color-text))]">سایر بخش‌ها</h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {secondaryCards.map((card) => (
            <SecondaryCard key={card.path} card={card} />
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-3 pt-2"
      >
        <div className="h-px flex-1 bg-[rgb(var(--color-border))]" />
        <span className="text-xs text-[rgb(var(--color-text-muted))] whitespace-nowrap">
          پنل مدیریت ربات تلگرام · نسخه ۱.۰.۰
        </span>
        <div className="h-px flex-1 bg-[rgb(var(--color-border))]" />
      </motion.div>
    </div>
  );
}
