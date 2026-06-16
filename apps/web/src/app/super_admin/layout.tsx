'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Building2, LayoutDashboard, FileText, Settings, User, LogOut, BarChart3, Bell, IndianRupee, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { RoleGuard } from '@/components/auth/role-guard';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/super_admin', icon: LayoutDashboard },
  { name: 'Hotels', href: '/super_admin/hotels', icon: Building2 },
  { name: 'Metrics', href: '/super_admin/metrics', icon: BarChart3 },
  { name: 'Finances', href: '/super_admin/finances', icon: IndianRupee },
  { name: 'Audit Logs', href: '/super_admin/audit-logs', icon: FileText },
];

const SYSTEM_ITEMS: NavItem[] = [
  { name: 'Settings', href: '/super_admin/settings', icon: Settings },
  { name: 'My Account', href: '/super_admin/account', icon: User },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <RoleGuard allowedRoles={['superadmin']}>
      <div className="flex min-h-screen bg-[#F8F9FA] font-sans overflow-hidden">
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Super Admin Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col h-screen transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 leading-tight">Blizz Books</h1>
                <p className="text-xs text-gray-500">Super Admin</p>
              </div>
            </div>
          </div>

          {/* Profile Badge */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                SA
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-gray-500">Superadmin</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="px-3 mb-2">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase px-3">Main</p>
            </div>
            <nav className="px-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-orange-50 text-orange-600" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 mb-2 mt-6">
              <p className="text-xs font-semibold text-gray-400 tracking-wider uppercase px-3">System</p>
            </div>
            <nav className="px-3 space-y-1">
              {SYSTEM_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-orange-50 text-orange-600" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-2"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <Menu size={20} />
              </button>
              <div className="text-sm font-medium text-gray-700 hidden sm:block">Dashboard</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500 hidden md:block">
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="relative">
                <div 
                  className="cursor-pointer"
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {/* <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span> */}
                </div>
                
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                    <div className="p-3 border-b border-gray-100 font-semibold text-gray-800">
                      Notifications
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <div className="p-6 text-center text-sm text-gray-500">
                        No new notifications
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-l pl-4 ml-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  SA
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-bold text-gray-900">{user?.name || 'Admin User'}</p>
                  <p className="text-[10px] text-gray-500">Superadmin</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
