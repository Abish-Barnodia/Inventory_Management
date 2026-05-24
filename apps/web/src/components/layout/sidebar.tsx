'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  TrendingDown,
  TrendingUp,
  PieChart,
  FileText,
  Building2,
  Database,
  Grid,
  Users,
  Shield,
  Bell,
  User,
  LogOut,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

type MenuItem = { icon: any; label: string; href: string; badge?: number | string };
type MenuGroup = { title?: string; items: MenuItem[] };

const MENU_GROUPS: MenuGroup[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
      { icon: Package, label: 'Inventory', href: '/admin/inventory' },
      { icon: TrendingDown, label: 'Finances', href: '/admin/finances' },
      { icon: Building2, label: 'Settings', href: '/admin/settings' },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-background border-r flex flex-col h-screen sticky top-0 font-sans">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-orange-500/20">
          <Database size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">BhojAI</h1>
        </div>
      </div>

      {/* Profile */}
      <div className="px-6 py-4 flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
          AU
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-foreground">{user?.name || 'Admin User'}</p>
          <p className="text-xs text-muted-foreground">Hotel Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto space-y-4 py-4 scrollbar-hide">
        {MENU_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-1">
            {group.title && (
              <h3 className="px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4">
                {group.title}
              </h3>
            )}
            {group.items.map((item) => {
              const isActive = pathname.startsWith(item.href) || (pathname === '/admin' && item.href === '/admin/dashboard');
              
              // Only top level Dashboard gets the orange background, others just text color if active
              const isDashboard = item.label === 'Dashboard';
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-md transition-all group relative",
                    isActive && isDashboard
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/20"
                      : isActive
                      ? "text-orange-500 bg-orange-50/50"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon size={18} className={cn("transition-colors", isActive && isDashboard ? "text-white" : isActive ? "text-orange-500" : "group-hover:text-muted-foreground")} />
                  <span className={cn("flex-1 text-sm font-medium", isActive && !isDashboard && "font-semibold")}>{item.label}</span>
                  {item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                      "bg-red-500 text-white"
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && isDashboard && (
                    <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full transform translate-x-[-16px]" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Bottom actions inside nav to scroll if needed */}
        <div className="pt-4 mt-4 space-y-1">
          <Link
            href="/admin/account"
            className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-all group"
          >
            <User size={18} />
            <span className="font-medium text-sm">My Account</span>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-all group"
          >
            <LogOut size={18} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
