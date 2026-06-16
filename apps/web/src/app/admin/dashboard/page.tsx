'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { dashboardApi } from '@/lib/api';
import { 
  Banknote, 
  BarChart3, 
  Package, 
  ClipboardList, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const result = await dashboardApi.getMetrics();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Error fetching dashboard metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: "TODAY'S REVENUE",
      value: `₹${(data?.today_revenue || 0).toLocaleString()}`,
      subtext: "Total collected today",
      subtextColor: "text-green-500",
      icon: Banknote,
      iconColor: "text-green-500",
      iconBg: "bg-green-100",
      topBorder: "border-t-green-500"
    },
    {
      title: "THIS MONTH'S P&L",
      value: `₹${(data?.month_pl || 0).toLocaleString()}`,
      subtext: "Net profit MTD",
      subtextColor: (data?.month_pl || 0) >= 0 ? "text-green-500" : "text-red-500",
      icon: BarChart3,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-100",
      topBorder: "border-t-blue-500"
    },
    {
      title: "INVENTORY ITEMS",
      value: `${data?.in_stock_items || 0}`,
      subtext: "Items with stock > 0",
      subtextColor: "text-gray-400",
      icon: Package,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-100",
      topBorder: "border-t-purple-500"
    },
    {
      title: "PENDING REQUESTS",
      value: `${data?.pending_requests || 0}`,
      subtext: "Awaiting approval",
      subtextColor: "text-gray-400",
      valueColor: "text-yellow-600",
      icon: ClipboardList,
      iconColor: "text-yellow-600",
      iconBg: "bg-yellow-100",
      topBorder: "border-t-yellow-400"
    },
    {
      title: "LOW STOCK ALERTS",
      value: `${data?.low_stock_count || 0}`,
      subtext: "Items below threshold",
      subtextColor: "text-gray-400",
      valueColor: "text-red-500",
      icon: AlertTriangle,
      iconColor: "text-red-500",
      iconBg: "bg-red-100",
      topBorder: "border-t-red-500"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500 font-sans">
        
        {/* Top Stat Cards */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
          {statCards.map((card, i) => (
            <Card key={i} className={`border-t-[3px] shadow-sm ${card.topBorder}`}>
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className={`w-8 h-8 rounded-md ${card.iconBg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{card.title}</p>
                  <h3 className={`text-2xl font-black ${card.valueColor || 'text-gray-800'}`}>{card.value}</h3>
                  <p className={`text-[11px] mt-1 font-medium ${card.subtextColor}`}>{card.subtext}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>



        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* P&L Trend Chart */}
          <Card className="lg:col-span-2 shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-gray-800">P&L Trend — Last 30 Days</CardTitle>
              <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                <button className="px-3 py-1 text-[11px] font-bold bg-white shadow-sm rounded text-gray-800">30D</button>
                <button className="px-3 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-800">7D</button>
                <button className="px-3 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-800">90D</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs font-semibold mb-6">
                <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-[#10b981] rounded-full"></div> Revenue</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-1 bg-[#ef4444] rounded-full"></div> Expenses</div>
              </div>
              
              {/* Simple SVG Line Chart Mockup */}
              <div className="relative w-full h-[220px] mt-2">
                <svg viewBox="0 0 1000 200" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                  {/* Defs for gradients */}
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Revenue Line */}
                  <path d="M0,150 C100,140 200,80 300,70 C400,60 500,40 600,60 C700,80 800,30 900,40 L1000,45" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                  <path d="M0,150 C100,140 200,80 300,70 C400,60 500,40 600,60 C700,80 800,30 900,40 L1000,45 L1000,200 L0,200 Z" fill="url(#revenueGradient)" />

                  {/* Expense Line */}
                  <path d="M0,180 C150,170 250,165 350,170 C450,175 550,160 650,165 C750,170 850,140 1000,145" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
                  <path d="M0,180 C150,170 250,165 350,170 C450,175 550,160 650,165 C750,170 850,140 1000,145 L1000,200 L0,200 Z" fill="url(#expenseGradient)" />
                </svg>
                {/* X Axis Labels */}
                <div className="absolute bottom-[-10px] left-0 w-full flex justify-between text-[10px] font-semibold text-gray-400 px-2">
                  <span>May 1</span>
                  <span>May 10</span>
                  <span>May 20</span>
                  <span>May 23</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Expense Categories */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-sm font-bold text-gray-800">Top Expense Categories</CardTitle>
              <span className="text-[10px] text-gray-400 font-semibold">This Month</span>
            </CardHeader>
            <CardContent>
              <div className="space-y-5 mt-2">
                {data?.top_expenses?.length > 0 ? (
                  data.top_expenses.map((expense: any, idx: number) => {
                    const colors = [
                      { bg: 'bg-[#f97316]' },
                      { bg: 'bg-[#3b82f6]' },
                      { bg: 'bg-[#8b5cf6]' },
                      { bg: 'bg-[#eab308]' },
                      { bg: 'bg-[#10b981]' }
                    ];
                    const color = colors[idx % colors.length];
                    const maxExpense = Math.max(...data.top_expenses.map((e: any) => e.total));
                    const percentage = maxExpense > 0 ? (expense.total / maxExpense) * 100 : 0;
                    
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                        <span className="w-24 text-gray-500 truncate">{expense.category}</span>
                        <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`${color.bg} h-full rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="w-16 text-right text-gray-800">₹{expense.total.toLocaleString()}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm text-gray-400 py-4">No expense data for this month</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Recent Stock Requests */}
          <Card className="lg:col-span-2 shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-800">Recent Stock Requests</CardTitle>
              <a href="#" className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center">
                View all <span className="ml-1">→</span>
              </a>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-400 font-bold bg-gray-50/50">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold text-center">Qty</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold text-gray-700 divide-y divide-gray-100">
                  {data?.recent_requests?.length > 0 ? (
                    data.recent_requests.map((req: any) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{req.item_name}</td>
                        <td className="px-4 py-3">{req.department_name}</td>
                        <td className="px-4 py-3 text-center">{req.quantity} {req.unit || ''}</td>
                        <td className="px-4 py-3 text-center">
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-yellow-50 text-yellow-600 border border-yellow-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Pending
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                              ✓ Approved
                            </span>
                          )}
                          {req.status === 'issued' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-200">
                              ✓ Issued
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No recent requests</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Low Stock Alerts
              </CardTitle>
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">{data?.low_stock_count || 0} items</span>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] uppercase text-gray-400 font-bold bg-gray-50/50">
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold text-center">Current Stock</th>
                    <th className="px-4 py-3 font-semibold text-right">Threshold</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-semibold divide-y divide-gray-100">
                  {data?.low_stock_items?.length > 0 ? (
                    data.low_stock_items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{item.name}</td>
                        <td className="px-4 py-3 text-center text-red-500 font-bold">{item.current_stock} {item.unit || ''}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.minimum_stock} {item.unit || ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-400">No items are low on stock</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
