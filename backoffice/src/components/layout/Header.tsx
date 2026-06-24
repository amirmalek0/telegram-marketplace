import { motion } from 'framer-motion';
import { Sun, Moon, Bell, Search, Menu } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

export function Header() {
  const { toggleSidebar, toggleTheme, theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <header
      className={cn(
        'h-16 flex items-center justify-between px-5 sticky top-0 z-30',
        'bg-[rgb(var(--color-surface))]/90 backdrop-blur-xl',
        'border-b border-[rgb(var(--color-border))]',
      )}
    >
      {/* Right side — hamburger + search */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-text-secondary))] transition-colors"
          aria-label="تغییر منو"
        >
          <Menu size={18} />
        </button>

        {/* Search bar */}
        <div className="hidden sm:flex items-center gap-2 bg-[rgb(var(--color-surface-2))] border border-[rgb(var(--color-border))] rounded-xl px-3 py-2 w-56 group focus-within:border-[#0088cc]/50 focus-within:ring-2 focus-within:ring-[#0088cc]/10 transition-all">
          <Search size={14} className="text-[rgb(var(--color-text-muted))] flex-shrink-0" />
          <input
            type="text"
            placeholder="جستجو..."
            className="bg-transparent text-sm text-[rgb(var(--color-text))] placeholder:text-[rgb(var(--color-text-muted))] outline-none w-full"
          />
          <kbd className="hidden group-focus-within:hidden text-[10px] text-[rgb(var(--color-text-muted))] bg-[rgb(var(--color-border))] px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
      </div>

      {/* Left side — actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-text-secondary))] transition-colors"
          aria-label="اعلان‌ها"
        >
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#0088cc] rounded-full ring-2 ring-[rgb(var(--color-surface))]" />
        </button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl transition-colors',
            isDark
              ? 'hover:bg-yellow-500/10 text-yellow-400'
              : 'hover:bg-[rgb(var(--color-surface-2))] text-[rgb(var(--color-text-secondary))]'
          )}
          aria-label="تغییر تم"
        >
          <motion.div
            key={isDark ? 'sun' : 'moon'}
            initial={{ rotate: -30, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </motion.div>
        </motion.button>

        {/* Divider */}
        <div className="w-px h-5 bg-[rgb(var(--color-border))] mx-1" />

        {/* Avatar */}
        <button className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-[rgb(var(--color-surface-2))] transition-colors group">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-[rgb(var(--color-text))] leading-tight">مدیر سیستم</p>
            <p className="text-[10px] text-[rgb(var(--color-text-muted))]">admin</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0088cc] to-[#00c6ff] flex items-center justify-center text-white text-xs font-bold shadow-md shadow-[#0088cc]/20 flex-shrink-0">
            A
          </div>
        </button>
      </div>
    </header>
  );
}
