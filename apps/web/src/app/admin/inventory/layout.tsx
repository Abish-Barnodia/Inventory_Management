'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Package, PlusCircle, ArrowRightLeft, ClipboardList, Database, CheckCircle } from 'lucide-react';
import { InventoryProvider } from './context';

const TABS = [
  { name: 'Overview', href: '/admin/inventory', icon: Package },
  { name: 'Masters', href: '/admin/inventory/masters', icon: Database },
  { name: 'Stock Data', href: '/admin/inventory/data', icon: Database },
  { name: 'Stock Entries', href: '/admin/inventory/entries', icon: PlusCircle },
  { name: 'Stock Issuances', href: '/admin/inventory/issuances', icon: ArrowRightLeft },
  { name: 'Kitchen Request', href: '/admin/inventory/kitchen-request', icon: ClipboardList },
  { name: 'Stock Requests', href: '/admin/inventory/requests', icon: ClipboardList },
  { name: 'Stock Approved', href: '/admin/inventory/approved', icon: CheckCircle },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardLayout>
      <InventoryProvider>
        <div className="-mx-4 md:-mx-6 -mt-6 px-4 md:px-6 bg-white border-b mb-6 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-6 md:gap-8 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => {
              const isActive = pathname === tab.href;
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
      </InventoryProvider>
    </DashboardLayout>
  );
}
