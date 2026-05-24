'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('Daily');

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
    fetchPnLData(activeTab);
  }, [activeTab]);

  const fetchPnLData = async (period: string) => {
    try {
      const response = await apiClient.get(`/finances/analytics/pnl?period=${encodeURIComponent(period)}`);
      if (response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch P&L analytics:', error);
    }
  };

  // Compute heights for the visual bar chart relative to the highest value
  const maxVal = Math.max(data.breakdown.purchase, data.breakdown.fixed, data.breakdown.variable, data.metrics.netPnL);
  const getH = (val: number) => `${Math.max((maxVal > 0 ? (val / maxVal) : 0) * 100, 5)}%`;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">P&L Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Hotel Admin exclusive — profit & loss insights</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2 text-gray-700 font-semibold border-gray-300"
          onClick={async () => {
            toast.loading(`Exporting P&L Report (${activeTab})...`, { id: 'export-toast' });
            try {
              const response = await apiClient.get('/finances/reports/export?reportType=pnl&format=csv', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', 'pnl_report.csv');
              document.body.appendChild(link);
              link.click();
              link.remove();
              toast.success(`P&L Report downloaded!`, { id: 'export-toast' });
            } catch (err) {
              toast.error(`Failed to export report`, { id: 'export-toast' });
            }
          }}
        >
          <Download className="w-4 h-4" /> Export P&L
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-full border p-1 w-max shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
            }}
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
                <span className="text-green-600">₹{data.metrics.netPnL.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="bg-green-100 rounded-lg p-4 text-center mt-4">
              <span className="block text-2xl font-bold text-green-700">{data.metrics.marginPercent}%</span>
              <span className="text-xs text-green-600 font-medium">Profit Margin</span>
            </div>
          </CardContent>
        </Card>

        {/* Right Card - Chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-4 border-b bg-gray-50/50">
            <CardTitle className="text-base font-semibold">Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-12 pb-6 px-8 flex justify-center items-end h-[320px] relative">
            {/* Simple CSS Chart */}
            <div className="flex items-end justify-center gap-8 w-full h-full relative border-b border-gray-200">
              
              <div className="flex flex-col items-center gap-2 group w-20">
                <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">Purchase</span>
                <div 
                  className="w-full bg-orange-400 rounded-t-md relative group-hover:bg-orange-500 transition-colors" 
                  style={{ height: getH(data.breakdown.purchase) }}
                ></div>
                <span className="text-xs font-medium text-gray-600">₹{data.breakdown.purchase.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex flex-col items-center gap-2 group w-20">
                <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">Fixed</span>
                <div 
                  className="w-full bg-blue-500 rounded-t-md relative group-hover:bg-blue-600 transition-colors" 
                  style={{ height: getH(data.breakdown.fixed) }}
                ></div>
                <span className="text-xs font-medium text-gray-600">₹{data.breakdown.fixed.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex flex-col items-center gap-2 group w-20">
                <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6">Variable</span>
                <div 
                  className="w-full bg-purple-400 rounded-t-md relative group-hover:bg-purple-500 transition-colors" 
                  style={{ height: getH(data.breakdown.variable) }}
                ></div>
                <span className="text-xs font-medium text-gray-600">₹{data.breakdown.variable.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex flex-col items-center gap-2 group w-20">
                <span className="text-xs text-green-600 font-medium absolute -top-6">Net Profit</span>
                <div 
                  className="w-full bg-green-500 rounded-t-md relative" 
                  style={{ height: getH(data.metrics.netPnL) }}
                ></div>
                <span className="text-xs font-medium text-gray-600">₹{data.metrics.netPnL.toLocaleString('en-IN')}</span>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
