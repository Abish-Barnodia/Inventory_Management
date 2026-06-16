'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Upload, Info, CheckCircle2, TrendingUp, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/apiClient';

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<any[]>([]);
  const [summary, setSummary] = useState({ thisMonth: 0, ytd: 0 });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRevenues();
  }, [startDate, endDate]);

  const fetchRevenues = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const response = await apiClient.get(`/finances/revenue?${queryParams.toString()}`);
      if (response.data) {
        setRevenues(response.data.revenues);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch revenues:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      toast.loading('Importing POS Report...', { id: 'import-toast' });
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await apiClient.post('/finances/revenue/import', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        toast.success(`Successfully parsed ${response.data.rowsParsed} rows and updated ledger.`, { id: 'import-toast' });
        
        // Refresh data
        fetchRevenues();
      } catch (error) {
        toast.error('Failed to import POS CSV report.', { id: 'import-toast' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Revenue & POS Import</h1>
          <p className="text-sm text-gray-500 mt-1">Hotel Admin exclusive — import and track your POS data</p>
        </div>
        <div>
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button 
            className="bg-orange-500 hover:bg-orange-600 gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" /> Import POS Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="p-4">
            <div className="flex gap-2 items-center mb-1 text-gray-500">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs font-bold uppercase">This Month</p>
            </div>
            <p className="text-2xl font-bold text-green-600">₹{summary.thisMonth.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">May 2026</p>
          </CardContent>
        </Card>
        
        <Card className="border-t-4 border-t-blue-500">
          <CardContent className="p-4">
            <div className="flex gap-2 items-center mb-1 text-gray-500">
              <Calendar className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-bold uppercase">Last Month</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">₹0</p>
            <p className="text-xs text-gray-400 mt-1">April 2026</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardContent className="p-4">
            <div className="flex gap-2 items-center mb-1 text-gray-500">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-xs font-bold uppercase">YTD Revenue</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">₹{summary.ytd.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">Jan 1 — May 23</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gray-400">
          <CardContent className="p-4">
            <div className="flex gap-2 items-center mb-1 text-gray-500">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="text-xs font-bold uppercase">Last Import</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">19 May</p>
            <p className="text-xs text-gray-400 mt-1">daily_sales_may2026.csv</p>
          </CardContent>
        </Card>
      </div>

      {/* Banner */}
      <div className="bg-blue-50 text-blue-800 border border-blue-100 rounded-lg p-3 flex items-center gap-3 text-sm">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
        <p>
          Last import on <span className="font-semibold">19 May 2026</span> — 22 rows parsed from <span className="font-semibold text-blue-600">daily_sales_may2026.csv</span>.
        </p>
        <button 
          className="text-orange-600 font-medium ml-auto hover:underline"
          onClick={() => router.push('/admin/finances/reports')}
        >
          View export & import history →
        </button>
      </div>

      {/* Ledger Table */}
      <Card>
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-semibold text-gray-800">Revenue Ledger</h3>
          
          <div className="flex gap-2 items-center">
            <select 
              className="h-10 px-3 border rounded-md bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            >
              <option value="All">All Time</option>
              <option value="Monthly">Monthly</option>
              <option value="Datewise">Date Range</option>
            </select>

            {filterType === 'Monthly' && (
              <input 
                type="month" 
                className="h-10 px-3 border rounded-md bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(e) => {
                  if (e.target.value) {
                    const year = e.target.value.split('-')[0];
                    const month = e.target.value.split('-')[1];
                    setStartDate(`${year}-${month}-01`);
                    const lastDay = new Date(Number(year), Number(month), 0).getDate();
                    setEndDate(`${year}-${month}-${lastDay}`);
                  } else {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
              />
            )}

            {filterType === 'Datewise' && (
              <>
                <div className="flex items-center gap-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="pl-3 py-2 flex items-center">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    className="border-0 shadow-none h-10 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-w-[120px] outline-none" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm border rounded-md bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <div className="pl-3 py-2 flex items-center">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <input 
                    type="date" 
                    className="border-0 shadow-none h-10 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent min-w-[120px] outline-none" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Gross Revenue</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Import Batch</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-600">{row.date}</td>
                  <td className="px-4 py-4 font-medium text-green-600">₹{row.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 text-gray-600">{row.source}</td>
                  <td className="px-4 py-4 text-gray-500">{row.batch}</td>
                </tr>
              ))}
              {revenues.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No revenue data. Import POS report to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
