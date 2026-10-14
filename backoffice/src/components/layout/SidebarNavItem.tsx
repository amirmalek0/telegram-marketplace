import { useEffect, useId, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SidebarItem {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: SidebarItem[];
}

interface Props {
  item: SidebarItem;
  collapsed: boolean;
  onNavigate: () => void;
  onExpandSidebar: () => void;
}

export function SidebarNavItem({ item, collapsed, onNavigate, onExpandSidebar }: Props) {
  const { pathname } = useLocation();
  const submenuId = useId();
  const matches = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const childActive = item.children?.some((child) => matches(child.to)) ?? false;
  const branchActive = matches(item.to) || childActive;
  const [expanded, setExpanded] = useState(branchActive);

  useEffect(() => {
    if (branchActive) setExpanded(true);
  }, [pathname, branchActive]);

  const navigate = () => {
    if (item.children) {
      setExpanded(true);
      if (collapsed) onExpandSidebar();
    }
    onNavigate();
  };

  return <div className={cn('sidebar-item', childActive && 'has-active-child')}>
    <div className="sidebar-item-row">
      <NavLink to={item.to} end={item.to === '/'} onClick={navigate} title={collapsed ? item.label : undefined} className={({ isActive }) => cn('sidebar-link', isActive && 'is-active')}>
        <item.icon size={18} />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
      {item.children && !collapsed && <button
        type="button"
        className="sidebar-submenu-toggle"
        aria-label={`${expanded ? 'بستن' : 'باز کردن'} زیرمنوی ${item.label}`}
        aria-expanded={expanded}
        aria-controls={submenuId}
        onClick={() => setExpanded((value) => !value)}
      ><ChevronDown size={15} className={cn('transition-transform', expanded && 'rotate-180')} /></button>}
    </div>
    {item.children && <div id={submenuId} className="sidebar-submenu" hidden={collapsed || !expanded}>
      {item.children.map((child) => <NavLink key={child.to} to={child.to} onClick={onNavigate} className={({ isActive }) => cn('sidebar-link', isActive && 'is-active')}>
        <child.icon size={16} /><span>{child.label}</span>
      </NavLink>)}
    </div>}
  </div>;
}
