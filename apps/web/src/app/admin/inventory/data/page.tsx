'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useInventory } from '../context';
import { Database, TrendingUp, CheckCircle2, Search } from 'lucide-react';

export default function StockDataPage() {
  const { stockData } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('');

  const filteredData = stockData.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'all' || item.department.toLowerCase() === departmentFilter.toLowerCase();
    const matchesDate = !dateFilter || item.approvalDate === dateFilter;
    const matchesExpiry = !expiryFilter || item.expiryDate === expiryFilter;
    
    return matchesSearch && matchesDepartment && matchesDate && matchesExpiry;
  });

  const uniqueDepartments = Array.from(new Set(stockData.map(item => item.department))).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stock Data</h1>
          <p className="text-gray-500">View all items that have been approved for departments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-800">Total Approved Items</p>
                <h3 className="text-2xl font-bold text-orange-900">{filteredData.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-orange-500 shadow-sm mb-6">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-1.5 flex-1 w-full relative">
            <Label>Search Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search approved items..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5 w-full md:w-48">
            <Label>Department</Label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 w-full md:w-48">
            <Label>Approval Date</Label>
            <Input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 w-full md:w-48">
            <Label>Expiry Date</Label>
            <Input 
              type="date"
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-500" />
            Approved Stock Data
          </CardTitle>
          <CardDescription>
            These items were approved from stock requests and have been recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Approval ID</th>
                  <th className="px-6 py-4 font-semibold">Item Name</th>
                  <th className="px-6 py-4 font-semibold">Department</th>
                  <th className="px-6 py-4 font-semibold">Approved Qty</th>
                  <th className="px-6 py-4 font-semibold">Approval Date</th>
                  <th className="px-6 py-4 font-semibold">Expiry Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map(item => {
                  const isExpiringSoon = item.expiryDate && new Date(item.expiryDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000;
                  const isExpired = item.expiryDate && new Date(item.expiryDate).getTime() < new Date().getTime();

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.itemName}</td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-normal">
                          {item.department}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {item.approvedQty} <span className="font-medium text-gray-500">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{item.approvalDate}</td>
                      <td className="px-6 py-4">
                        {item.expiryDate ? (
                          <span className={isExpired ? 'text-red-600 font-bold' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-500'}>
                            {item.expiryDate} {isExpired ? '(Expired)' : isExpiringSoon ? '(Soon)' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No approved stock data yet. Approve a request to see it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
