import { motion } from 'framer-motion';
import { Menu, Sun, Moon, Bell, Search } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { toggleSidebar, toggleTheme, theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-[rgb(var(--color-surface))]/80 backdrop-blur-md border-b border-[rgb(var(--color-border))] sticky top-0 z-30">
      {/* Right side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] transition-colors"
          aria-label="تغییر منو"
        >
          <Menu size={20} />
        </button>

        {title && (
          <motion.h1
            key={title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-base font-semibold text-[rgb(var(--color-text))]"
          >
            {title}
          </motion.h1>
        )}
      </div>

      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className="p-2 rounded-xl hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] transition-colors"
          aria-label="جستجو"
        >
          <Search size={18} />
        </button>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] transition-colors"
          aria-label="اعلان‌ها"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0088cc] rounded-full" />
        </button>

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-xl transition-colors',
            isDark
              ? 'hover:bg-yellow-500/10 text-yellow-400'
              : 'hover:bg-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))]'
          )}
          aria-label="تغییر تم"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#0088cc] flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity">
          A
        </div>
      </div>
    </header>
  );
}
