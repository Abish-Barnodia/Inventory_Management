'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { 
  Banknote, 
  BarChart3, 
  Package, 
  ClipboardList, 
  AlertTriangle,
  Plus,
  Download,
  Upload,
  ArrowUp,
  CreditCard,
  FileText
} from 'lucide-react';

export default function AdminDashboardPage() {
  const statCards = [
    {
      title: "TODAY'S REVENUE",
      value: "₹84,500",
      subtext: "↑ 12% vs yesterday",
      subtextColor: "text-green-500",
      icon: Banknote,
      iconColor: "text-green-500",
      iconBg: "bg-green-100",
      topBorder: "border-t-green-500"
    },
    {
      title: "THIS MONTH'S P&L",
      value: "₹7.7L",
      subtext: "Net profit MTD",
      subtextColor: "text-gray-400",
      icon: BarChart3,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-100",
      topBorder: "border-t-blue-500"
    },
    {
      title: "INVENTORY ITEMS",
      value: "142",
      subtext: "Items with stock > 0",
      subtextColor: "text-gray-400",
      icon: Package,
      iconColor: "text-purple-500",
      iconBg: "bg-purple-100",
      topBorder: "border-t-purple-500"
    },
    {
      title: "PENDING REQUESTS",
      value: "5",
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
      value: "8",
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-semibold shadow-sm h-10 px-4 rounded-lg">
            <Plus className="w-4 h-4 mr-2 text-purple-600 stroke-[3]" /> Add Stock Entry
          </Button>
          <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-semibold shadow-sm h-10 px-4 rounded-lg">
            <CreditCard className="w-4 h-4 mr-2 text-green-600 stroke-[3]" /> Add Expense
          </Button>
          <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-semibold shadow-sm h-10 px-4 rounded-lg">
            <Download className="w-4 h-4 mr-2 text-blue-600 stroke-[3]" /> Import POS Report
          </Button>
          <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-semibold shadow-sm h-10 px-4 rounded-lg">
            <Upload className="w-4 h-4 mr-2 text-red-500 stroke-[3]" /> Export Report
          </Button>
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
                {/* Veggies */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="w-24 text-gray-500">Vegetables</span>
                  <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#f97316] h-full rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <span className="w-16 text-right text-gray-800">₹43,200</span>
                </div>
                {/* Dairy */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="w-24 text-gray-500">Dairy</span>
                  <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#3b82f6] h-full rounded-full" style={{ width: '70%' }}></div>
                  </div>
                  <span className="w-16 text-right text-gray-800">₹35,600</span>
                </div>
                {/* Meat */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="w-24 text-gray-500">Meat</span>
                  <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#8b5cf6] h-full rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <span className="w-16 text-right text-gray-800">₹28,900</span>
                </div>
                {/* Dry Goods */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="w-24 text-gray-500">Dry Goods</span>
                  <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#eab308] h-full rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <span className="w-16 text-right text-gray-800">₹19,800</span>
                </div>
                {/* Beverages */}
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="w-24 text-gray-500">Beverages</span>
                  <div className="flex-1 mx-3 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#10b981] h-full rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <span className="w-16 text-right text-gray-800">₹12,400</span>
                </div>
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
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Rice</td>
                    <td className="px-4 py-3">Main Kitchen</td>
                    <td className="px-4 py-3 text-center">10 kg</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-yellow-50 text-yellow-600 border border-yellow-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Pending
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">2 hrs ago</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Tomatoes</td>
                    <td className="px-4 py-3">Tea Stall</td>
                    <td className="px-4 py-3 text-center">5 kg</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-50 text-green-600 border border-green-200">
                        ✓ Approved
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">4 hrs ago</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Milk</td>
                    <td className="px-4 py-3">Bakery</td>
                    <td className="px-4 py-3 text-center">20 L</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-yellow-50 text-yellow-600 border border-yellow-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div> Pending
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">5 hrs ago</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Sugar</td>
                    <td className="px-4 py-3">Main Kitchen</td>
                    <td className="px-4 py-3 text-center">2 kg</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                        ✓ Issued
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">Yesterday</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Oil</td>
                    <td className="px-4 py-3">Tea Stall</td>
                    <td className="px-4 py-3 text-center">5 L</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                        ✕ Rejected
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">Yesterday</td>
                  </tr>
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
              <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">8 items</span>
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
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Onion</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">3.5 kg</td>
                    <td className="px-4 py-3 text-right text-gray-500">5 kg</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Paneer</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">0.8 kg</td>
                    <td className="px-4 py-3 text-right text-gray-500">2 kg</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Butter</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">1.2 kg</td>
                    <td className="px-4 py-3 text-right text-gray-500">2 kg</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Coriander</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">0.2 kg</td>
                    <td className="px-4 py-3 text-right text-gray-500">1 kg</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">Cumin</td>
                    <td className="px-4 py-3 text-center text-red-500 font-bold">0.4 kg</td>
                    <td className="px-4 py-3 text-right text-gray-500">0.5 kg</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

      </div>
    </DashboardLayout>
  );
}
