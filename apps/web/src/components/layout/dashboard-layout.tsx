'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { useAuth } from '@/hooks/use-auth';
import { CalendarDays, Clock, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { FilterProvider, useFilter } from '@/lib/filter-context';
import { usePathname } from 'next/navigation';

function DateTimeFilter() {
  const { filterDate, filterTime, setFilterDate, setFilterTime } = useFilter();

  const dateInputRef = React.useRef<HTMLInputElement>(null);
  const timeInputRef = React.useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !filterDate) {
    return (
      <div className="hidden md:flex items-center bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <CalendarDays size={14} className="text-gray-400" />
          <span className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-px h-4 bg-gray-300 mx-3" />
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock size={14} className="text-gray-400" />
          <span className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Format for display
  let displayDate = '';
  try {
    displayDate = new Date(filterDate + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { displayDate = filterDate; }

  let displayTime = filterTime;
  try {
    const [h, m] = filterTime.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10));
    d.setMinutes(parseInt(m, 10));
    displayTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  } catch { displayTime = filterTime; }

  return (
    <div className="hidden md:flex items-center bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
      <div
        onClick={() => dateInputRef.current?.showPicker()}
        className="relative flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
      >
        <CalendarDays size={14} className="text-blue-500" />
        <span>{displayDate}</span>
        <input
          ref={dateInputRef}
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <div className="w-px h-4 bg-gray-300 mx-3" />
      <div
        onClick={() => timeInputRef.current?.showPicker()}
        className="relative flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
      >
        <Clock size={14} className="text-red-400" />
        <span>{displayTime}</span>
        <input
          ref={timeInputRef}
          type="time"
          value={filterTime}
          onChange={(e) => setFilterTime(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Create a simple breadcrumb from the pathname
  const pathParts = pathname.split('/').filter(Boolean);
  const sectionName = pathParts[1] ? pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1) : 'Overview';

  const [expiryCount, setExpiryCount] = useState(0);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const prefix = user.hotelId ? `hotel_${user.hotelId}_` : '';
    const checkExpiries = () => {
      try {
        const stored = localStorage.getItem(`${prefix}inventory_stock_data`);
        if (stored) {
          const data = JSON.parse(stored);
          const expiring = data.filter((item: any) => {
            if (!item.expiryDate) return false;
            const ms = new Date(item.expiryDate).getTime() - Date.now();
            return ms < 7 * 24 * 60 * 60 * 1000;
          });
          setExpiryCount(expiring.length);
          setExpiringItems(expiring);
        }
      } catch (e) {}
    };
    checkExpiries();
    const interval = setInterval(checkExpiries, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <FilterProvider>
      <div className="flex min-h-screen bg-[#F5F7FA] print:hidden font-sans overflow-hidden">
        
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:z-auto ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <Sidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top Header Bar ── */}
          <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm relative">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <Menu size={20} />
              </button>
              {/* Left Breadcrumb */}
              <div className="text-sm hidden sm:block">
                <span className="text-gray-400 font-medium">Dashboard / </span>
                <span className="text-gray-700 font-bold">{sectionName}</span>
              </div>
              <div className="text-sm sm:hidden font-bold text-gray-700">
                {sectionName}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <DateTimeFilter />

              <div className="relative group">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                  <Bell size={18} className="text-gray-600" />
                  {expiryCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {expiryCount}
                    </span>
                  )}
                </div>
                
                {expiryCount > 0 && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                    <div className="p-3 border-b bg-gray-50 rounded-t-lg font-semibold text-sm">Notifications</div>
                    <div className="max-h-60 overflow-y-auto">
                      {expiringItems.map((item, idx) => {
                        const isExpired = new Date(item.expiryDate).getTime() < Date.now();
                        return (
                          <div key={idx} className="p-3 border-b last:border-0 text-sm hover:bg-gray-50">
                            <p className="font-semibold text-gray-800">{item.itemName}</p>
                            <p className={isExpired ? "text-red-600 font-medium text-xs mt-0.5" : "text-orange-600 font-medium text-xs mt-0.5"}>
                              {isExpired ? 'Expired on ' : 'Expiring soon on '} {item.expiryDate}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-full pl-1 pr-3 py-1 transition-colors border border-gray-100 shadow-sm">
                <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                  AU
                </div>
                <div className="hidden md:block leading-tight pr-1">
                  <p className="text-sm font-bold text-gray-800">{user?.name || 'Admin User'}</p>
                  <p className="text-[11px] text-gray-400">Hotel Admin</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </div>
            </div>
          </header>

          {/* ── Main Content ── */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </FilterProvider>
  );
}
