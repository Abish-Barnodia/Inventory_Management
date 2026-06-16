'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { superAdminApi } from '@/lib/api';
import {
  Building2, Users, FileText, UploadCloud,
  Activity, Database, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlatformMetricsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const res = await superAdminApi.getFullMetrics();
        setMetrics(res.data);
      } catch (e) {
        console.error('Failed to load full metrics', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Failed to load platform metrics.
      </div>
    );
  }

  // Storage usage mock display (128GB out of 500GB cap)
  const maxStorage = 500;
  const currentStorage = metrics.storage_used_gb || 0;
  const storagePercent = Math.min(100, Math.round((currentStorage / maxStorage) * 100));

  const chartData = metrics.new_hotels_per_month || [];
  const maxChartValue = Math.max(...chartData.map((d: any) => d.count), 10); // at least 10 for scale

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Metrics</h1>
          <p className="text-gray-500 text-sm mt-1">Usage analytics and health monitoring</p>
        </div>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Users */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-500">Total Users (All Hotels)</h3>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{metrics.total_users}</span>
              <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Real-time active users
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock Entries 30d */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-500">Stock Entries (30 days)</h3>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{metrics.total_stock_entries_30d.toLocaleString()}</span>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Across {metrics.active_hotels} hotels
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bold text-gray-900">{currentStorage} GB</span>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500", 
                    storagePercent > 90 ? "bg-red-500" : storagePercent > 75 ? "bg-amber-500" : "bg-orange-500"
                  )} 
                  style={{ width: `${storagePercent}%` }} 
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {currentStorage} / {maxStorage} GB ({storagePercent}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Hotels per Month Chart */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">
              New Hotels per Month
            </CardTitle>
            <span className="text-xs text-gray-400">Last 12 months</span>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {chartData.map((d: any, idx: number) => {
                const widthPercent = d.count > 0 ? Math.max(5, (d.count / maxChartValue) * 100) : 0;
                const isCurrentMonth = idx === chartData.length - 1;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-8 text-xs text-gray-500 text-right font-medium">{d.month}</span>
                    <div className="flex-1 h-6 bg-gray-50 rounded-full flex items-center relative overflow-hidden group hover:bg-gray-100 transition-colors">
                      {d.count > 0 && (
                        <div 
                          className={cn("h-full transition-all duration-700 ease-out flex items-center px-3", 
                            isCurrentMonth ? "bg-orange-600" : "bg-orange-500"
                          )}
                          style={{ width: `${widthPercent}%` }}
                        >
                          <span className="text-[11px] font-bold text-white leading-none">{d.count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {chartData.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No data available for the last 12 months.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Most Active Hotels */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold text-gray-900">
              Top 10 Most Active Hotels
            </CardTitle>
            <span className="text-xs text-gray-400">Last 30 days</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-gray-400 font-semibold text-xs tracking-wider border-b border-gray-100 uppercase">
                <tr>
                  <th className="px-5 py-3 w-12 text-center">#</th>
                  <th className="px-5 py-3">Hotel</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {metrics.top_active_hotels?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                      No active hotels found.
                    </td>
                  </tr>
                ) : (
                  metrics.top_active_hotels?.map((hotel: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-center text-orange-500 font-semibold text-xs">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">{hotel.hotel_name}</td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize",
                          hotel.plan === 'premium' ? "bg-green-50 text-green-700 border-green-200" :
                          hotel.plan === 'enterprise' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          hotel.plan === 'basic' ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-gray-50 text-gray-700 border-gray-200"
                        )}>
                          {hotel.plan ? hotel.plan.replace('_', ' ') : 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {Number(hotel.transaction_count).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
