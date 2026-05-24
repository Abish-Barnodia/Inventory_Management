'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, PieChart, FileText } from 'lucide-react';
import { RoleGuard } from '@/components/auth/role-guard';

const TABS = [
  { name: 'Expenses', href: '/admin/finances/expenses', icon: TrendingDown },
  { name: 'Revenue', href: '/admin/finances/revenue', icon: TrendingUp },
  { name: 'Analytics (P&L)', href: '/admin/finances/analytics', icon: PieChart },
  { name: 'Reports', href: '/admin/finances/reports', icon: FileText },
];

export default function FinancesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <RoleGuard allowedRoles={['superadmin', 'admin', 'manager']}>
      <DashboardLayout>
        <div className="-mx-6 -mt-6 px-6 bg-white border-b mb-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-8 overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          {children}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
