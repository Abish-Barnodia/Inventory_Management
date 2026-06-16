'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Info, Loader2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';
import { superAdminApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function SuperAdminFinancesPage() {
  const [activeTab, setActiveTab] = useState('Daily');
  const [hotels, setHotels] = useState<any[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const tabs = ['Daily', 'Weekly', 'Monthly', 'Custom', 'Year to Date'];

  // State data that will later be populated by API
  const [data, setData] = useState({
    period: 'Daily',
    dateRange: { start: '', end: '' },
    metrics: {
      grossRevenue: 0,
      totalExpenses: 0,
      netPnL: 0,
      marginPercent: 0,
      costRatioPercent: 0
    },
    breakdown: {
      purchase: 0,
      fixed: 0,
      variable: 0
    }
  });

  useEffect(() => {
    async function init() {
      try {
        const response = await superAdminApi.getHotels();
        setHotels(response.data.filter((h: any) => h.status === 'active'));
      } catch (err) {
        console.error('Failed to load hotels', err);
      }
      fetchPnLData(activeTab, selectedHotelId);
    }
    init();
  }, []);

  useEffect(() => {
    fetchPnLData(activeTab, selectedHotelId);
  }, [activeTab, selectedHotelId]);

  const fetchPnLData = async (period: string, hotelId: string) => {
    setIsLoading(true);
    try {
      // Pass the selected hotelId in headers for the superadmin request
      const headers: any = {};
      if (hotelId) {
        headers['x-hotel-id'] = hotelId;
      }
      
      const response = await apiClient.get(`/finances/analytics/pnl?period=${encodeURIComponent(period)}`, { headers });
      if (response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch P&L analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = [
    { name: 'Purchase', amount: data.breakdown.purchase, color: '#f97316' },
    { name: 'Fixed', amount: data.breakdown.fixed, color: '#3b82f6' },
    { name: 'Variable', amount: data.breakdown.variable, color: '#a855f7' },
    { name: 'Net Profit', amount: data.metrics.netPnL, color: data.metrics.netPnL >= 0 ? '#22c55e' : '#ef4444' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Platform Finances</h1>
          <p className="text-sm text-gray-500 mt-1">Super Admin global profit & loss insights</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Hotel Filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
            <Building2 className="w-4 h-4 text-gray-500" />
            <select
              value={selectedHotelId}
              onChange={(e) => setSelectedHotelId(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 w-[180px] cursor-pointer"
            >
              <option value="all">All Hotels (Overall)</option>
              {hotels.map(hotel => (
                <option key={hotel.id} value={String(hotel.id)}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </div>
          
          <Button 
            variant="outline" 
            className="gap-2 text-gray-700 font-semibold border-gray-300"
            onClick={async () => {
              toast.loading(`Exporting P&L Report (${activeTab})...`, { id: 'export-toast' });
              try {
                const headers: any = {};
                if (selectedHotelId) headers['x-hotel-id'] = selectedHotelId;
                
                const response = await apiClient.get('/finances/reports/export?reportType=pnl&format=csv', { 
                  headers,
                  responseType: 'blob' 
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'platform_pnl_report.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                toast.success(`P&L Report downloaded!`, { id: 'export-toast' });
              } catch (err) {
                toast.error(`Failed to export report`, { id: 'export-toast' });
              }
            }}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-full border p-1 w-max shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
              activeTab === tab 
                ? "bg-gray-100 text-gray-900 shadow-sm border border-gray-200" 
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200 shadow-sm">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Card - P&L Details */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
              <CardTitle className="text-base font-semibold">P&L — {activeTab} View</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-gray-700">Gross Revenue</span>
                <span className="text-green-600">₹{data.metrics.grossRevenue.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">— Purchase Expenses</span>
                <span className="text-gray-700">₹{data.breakdown.purchase.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 flex items-center gap-1">
                  — Fixed Expenses 
                  <span className="text-[10px] text-orange-500 bg-orange-50 px-1 py-0.5 rounded font-medium flex items-center gap-1">
                    <Info className="w-3 h-3" /> prorated
                  </span>
                </span>
                <span className="text-gray-700">₹{data.breakdown.fixed.toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">— Variable Expenses</span>
                <span className="text-gray-700">₹{data.breakdown.variable.toLocaleString('en-IN')}</span>
              </div>

              <div className="border-t pt-4 mt-2">
                <div className="flex justify-between items-center font-bold text-gray-900">
                  <span>Net Profit</span>
                  <span className={data.metrics.netPnL >= 0 ? "text-green-600" : "text-red-600"}>
                    ₹{data.metrics.netPnL.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className={cn("rounded-lg p-4 text-center mt-4", data.metrics.marginPercent >= 0 ? "bg-green-100" : "bg-red-100")}>
                <span className={cn("block text-2xl font-bold", data.metrics.marginPercent >= 0 ? "text-green-700" : "text-red-700")}>
                  {data.metrics.marginPercent}%
                </span>
                <span className={cn("text-xs font-medium", data.metrics.marginPercent >= 0 ? "text-green-600" : "text-red-600")}>
                  Profit Margin
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right Card - Chart */}
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
              <CardTitle className="text-base font-semibold">Expense Breakdown by Category</CardTitle>
            </CardHeader>
            <CardContent className="pt-12 pb-6 px-8 flex justify-center items-end h-[320px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value}`}
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
