'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, CheckCircle2, CalendarPlus, CalendarClock, DollarSign, AlertCircle, Info, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { superAdminApi } from '@/lib/api';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentHotels, setRecentHotels] = useState<any[]>([]);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [metricsRes, hotelsRes] = await Promise.all([
          superAdminApi.getMetrics(),
          superAdminApi.getRecentHotels()
        ]);
        setMetrics(metricsRes.data);
        setRecentHotels(hotelsRes.data);
      } catch (error) {
        console.error('Failed to fetch superadmin data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const {
    total_hotels = 0,
    active_hotels = 0,
    suspended_hotels = 0,
    new_this_month = 0,
    expiring_within_30_days = 0,
    revenue_mrr = 0,
    by_plan = { free_trial: 0, basic: 0, premium: 0, enterprise: 0 }
  } = metrics || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time health of the Blizz Books platform</p>
        </div>

      </div>



      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Hotels */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded bg-orange-50 flex items-center justify-center mb-3">
              <Building2 className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Total Hotels</p>
            <h3 className="text-3xl font-bold text-gray-900">{total_hotels}</h3>
            <p className="text-xs text-gray-500 mt-1">• {active_hotels} active, {suspended_hotels} suspended</p>
          </CardContent>
        </Card>

        {/* Active Hotels */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Active Hotels</p>
            <h3 className="text-3xl font-bold text-gray-900">{active_hotels}</h3>
            <p className="text-xs text-green-600 mt-1 font-medium">↗ +3 from last month</p>
          </CardContent>
        </Card>

        {/* New This Month */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center mb-3">
              <CalendarPlus className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">New This Month</p>
            <h3 className="text-3xl font-bold text-gray-900">{new_this_month}</h3>
            <p className="text-xs text-green-600 mt-1 font-medium">↗ +40% vs May</p>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center mb-3">
              <CalendarClock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">Expiring Soon</p>
            <h3 className="text-3xl font-bold text-gray-900">{expiring_within_30_days}</h3>
            <p className="text-xs text-amber-600 mt-1 font-medium cursor-pointer hover:underline">Within 30 days →</p>
          </CardContent>
        </Card>

        {/* Revenue (New Addition) */}
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-5">
            <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center mb-3">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1">MRR (Revenue)</p>
            <h3 className="text-3xl font-bold text-gray-900">₹{(revenue_mrr / 100000).toFixed(1)}L</h3>
            <p className="text-xs text-green-600 mt-1 font-medium">↗ +12% this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Hotels Table */}
        <Card className="lg:col-span-2 shadow-sm border-gray-200 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Recent Hotels</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Latest registered properties</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs font-medium bg-white">View All</Button>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-gray-400 font-semibold text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 uppercase">Hotel</th>
                  <th className="px-6 py-3 uppercase">Plan</th>
                  <th className="px-6 py-3 uppercase">Status</th>
                  <th className="px-6 py-3 uppercase">Expiry</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentHotels.length > 0 ? recentHotels.map((hotel) => (
                  <React.Fragment key={hotel.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{hotel.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{hotel.owner_name} · {hotel.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        {hotel.plan === 'premium' && <Badge className="bg-green-50 text-green-700 hover:bg-green-50 shadow-none border border-green-200 rounded">Premium</Badge>}
                        {hotel.plan === 'enterprise' && <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-50 shadow-none border border-amber-200 rounded">Enterprise</Badge>}
                        {hotel.plan === 'basic' && <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 shadow-none border border-blue-200 rounded">Basic</Badge>}
                        {hotel.plan === 'free_trial' && <span className="text-gray-500 font-medium">Free Trial</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${hotel.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                          <span className={hotel.status === 'active' ? 'text-green-700 font-medium capitalize' : 'text-amber-700 font-medium capitalize'}>{hotel.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={!hotel.expiry || new Date(hotel.expiry) < new Date() ? 'text-red-500 font-medium' : 'text-gray-600 font-medium'}>
                          {hotel.expiry ? new Date(hotel.expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setExpandedHotelId(expandedHotelId === hotel.id ? null : hotel.id)}
                          className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {expandedHotelId === hotel.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={5} className="px-6 py-4 border-b border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hotel ID</span>
                              <span className="text-gray-900 font-mono text-xs">{hotel.id}</span>
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Owner Email</span>
                              <span className="text-gray-900">{hotel.owner_email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Joined</span>
                              <span className="text-gray-900">{hotel.created_at ? new Date(hotel.created_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Users</span>
                              <span className="text-gray-900">{hotel.users_count || 0}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No hotels found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Subscription Breakdown Chart */}
        <Card className="shadow-sm border-gray-200 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-gray-900">Subscription Breakdown</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{active_hotels} active hotels</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center flex-1 p-6">
            
            {/* CSS-based Donut Chart visualization */}
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border-[16px] border-transparent"
                style={{
                  background: 'conic-gradient(#22c55e 0% 41%, #3b82f6 41% 68%, #f59e0b 68% 86%, #9ca3af 86% 100%)',
                  borderRadius: '50%'
                }}
              ></div>
              <div className="absolute inset-[16px] rounded-full bg-white flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{active_hotels}</span>
                <span className="text-xs text-gray-500 font-medium mt-1">active</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full max-w-[200px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500"></span>
                  <span className="text-xs font-medium text-gray-600">Premium</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{by_plan.premium}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                  <span className="text-xs font-medium text-gray-600">Basic</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{by_plan.basic}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
                  <span className="text-xs font-medium text-gray-600">Enterprise</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{by_plan.enterprise}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gray-400"></span>
                  <span className="text-xs font-medium text-gray-600">Trial</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{by_plan.free_trial}</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
