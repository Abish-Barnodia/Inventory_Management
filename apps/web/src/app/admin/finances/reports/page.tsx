'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, BarChart2, IndianRupee, Package, FileText, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

export default function ReportsPage() {
  const [history] = useState<any[]>([]);

  const handleDownloadReport = async (type: string) => {
    toast.loading(`Generating ${type} Report (CSV)...`, { id: 'report-toast' });
    try {
      const response = await apiClient.get(`/finances/reports/export?reportType=${type}&format=csv`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} Report downloaded!`, { id: 'report-toast' });
    } catch (err) {
      toast.error(`Failed to export ${type} report`, { id: 'report-toast' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports & Exports</h1>
        <p className="text-sm text-gray-500">Download P&L, expense, inventory, and audit reports</p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">P&L Report</h3>
              <p className="text-sm text-gray-500 mt-1">Full profit & loss for any period</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => handleDownloadReport('pnl')}>CSV Export</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Expense Report</h3>
              <p className="text-sm text-gray-500 mt-1">All expenses with filters</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => handleDownloadReport('expenses')}>CSV Export</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Inventory Report</h3>
              <p className="text-sm text-gray-500 mt-1">Stock levels + purchase history</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => handleDownloadReport('inventory')}>CSV Export</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Stock Request Log</h3>
              <p className="text-sm text-gray-500 mt-1">All requests with status history</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => handleDownloadReport('requests')}>CSV Export</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Search className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Audit Log</h3>
              <p className="text-sm text-gray-500 mt-1">All audit events for the hotel</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white" onClick={() => handleDownloadReport('audit')}>CSV Export</Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Export History Table */}
      <Card>
        <div className="p-4 border-b bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Export History</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Generated</th>
                <th className="px-4 py-3 font-medium">Report Type</th>
                <th className="px-4 py-3 font-medium">Period</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-600">{row.generated}</td>
                  <td className="px-4 py-4 text-gray-900 font-medium">{row.type}</td>
                  <td className="px-4 py-4 text-gray-600">{row.period}</td>
                  <td className="px-4 py-4 font-medium text-gray-700">{row.format}</td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className={cn(
                      "font-medium",
                      row.status === 'Ready' ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"
                    )}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    {row.status === 'Ready' ? (
                      <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                        <Download className="w-3 h-3" /> Download
                      </Button>
                    ) : (
                      <span className="text-gray-400 font-bold ml-4">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No recent export history. Downloads will trigger directly in your browser.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
