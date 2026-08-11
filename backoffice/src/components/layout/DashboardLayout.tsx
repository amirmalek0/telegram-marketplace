import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();
  return <div className={cn('app-shell', sidebarCollapsed && 'sidebar-collapsed')}><Sidebar /><div className="app-main"><Header /><main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7"><Outlet /></main></div></div>;
}
