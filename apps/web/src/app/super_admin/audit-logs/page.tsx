'use client';

import React, { useState, useEffect } from 'react';
import { Download, Search, Loader2, Calendar } from 'lucide-react';
import { superAdminApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// Helper for formatting date like "23 May 10:49"
const formatAuditDate = (dateString: string) => {
  const d = new Date(dateString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${hours}:${mins}`;
};

// Helper for CSV export filename "20260523_104900"
const formatExportDate = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const ACTION_COLORS: Record<string, string> = {
  'CREATE': 'text-emerald-700 bg-emerald-50 border-emerald-100',
  'UPDATE': 'text-blue-700 bg-blue-50 border-blue-100',
  'DELETE': 'text-red-700 bg-red-50 border-red-100',
  'SUSPEND': 'text-orange-700 bg-orange-50 border-orange-100',
  'PASSWORD_RESET': 'text-amber-700 bg-amber-50 border-amber-100',
  'LOGIN': 'text-purple-700 bg-purple-50 border-purple-100',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [hotels, setHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Filters
  const [searchActor, setSearchActor] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedHotel, setSelectedHotel] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const loadHotels = async () => {
    try {
      const res = await superAdminApi.getHotels();
      // res is { success: true, data: [...] }
      setHotels(res.data || []);
    } catch (error) {
      console.error('Failed to load hotels for filter:', error);
    }
  };

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (searchActor) params.actor = searchActor;
      if (selectedAction) params.action = selectedAction;
      if (selectedResource) params.resource = selectedResource;
      if (selectedHotel) params.hotel_id = selectedHotel;
      if (selectedDate) params.date = selectedDate;
      
      const res = await superAdminApi.getAuditLogs(params);
      setLogs(res.data || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 400); // debounce search
    return () => clearTimeout(timer);
  }, [searchActor, selectedAction, selectedResource, selectedHotel, selectedDate]);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params: any = {};
      if (searchActor) params.actor = searchActor;
      if (selectedAction) params.action = selectedAction;
      if (selectedResource) params.resource = selectedResource;
      if (selectedHotel) params.hotel_id = selectedHotel;
      if (selectedDate) params.date = selectedDate;

      // To handle JWT we fetch the CSV as blob using our configured apiClient
      // But we can't easily do it via our api.ts unless we add a specific blob method.
      // We will do a direct fetch with the token from localStorage
      const url = superAdminApi.getExportAuditLogsUrl(params);
      const token = localStorage.getItem('token');
      
      const response = await fetch(url, {
        headers: {
          'x-role': 'ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = downloadUrl;
      a.download = `audit_logs_${formatExportDate()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (error) {
      console.error('Failed to export CSV', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    const colorClass = ACTION_COLORS[action.toUpperCase()] || 'text-gray-700 bg-gray-50 border-gray-200';
    return (
      <span className={cn("px-2 py-0.5 rounded text-[11px] font-bold tracking-wide border uppercase", colorClass)}>
        {action}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Platform-wide activity across all hotels</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={isExporting}
          className="flex w-full sm:w-auto justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center bg-[#F8F9FA]">
          <div className="relative">
            <select 
              value={selectedHotel}
              onChange={(e) => setSelectedHotel(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-w-[150px]"
            >
              <option value="">All Hotels</option>
              {hotels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actor..."
              value={searchActor}
              onChange={(e) => setSearchActor(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 w-64 bg-white"
            />
          </div>

          <div className="relative">
            <select 
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-w-[140px]"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="SUSPEND">SUSPEND</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="LOGIN">LOGIN</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative">
            <select 
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="appearance-none bg-white border border-gray-200 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-w-[150px]"
            >
              <option value="">All Resources</option>
              <option value="hotel">hotel</option>
              <option value="user">user</option>
              <option value="stock_entry">stock_entry</option>
              <option value="stock_request">stock_request</option>
              <option value="department">department</option>
              <option value="subscription">subscription</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative flex items-center bg-white border border-gray-200 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 overflow-hidden min-w-[140px]">
            <Calendar className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-7 pr-2 py-1 text-sm text-gray-700 font-medium focus:outline-none w-full bg-transparent appearance-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F4EBE6] text-gray-500 font-medium text-xs tracking-wider uppercase border-b border-gray-200">
              <tr>
                <th className="px-6 py-3.5">TIMESTAMP</th>
                <th className="px-6 py-3.5">HOTEL</th>
                <th className="px-6 py-3.5">ACTOR</th>
                <th className="px-6 py-3.5">ACTION</th>
                <th className="px-6 py-3.5">RESOURCE</th>
                <th className="px-6 py-3.5">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                    Loading audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-medium whitespace-nowrap">
                      {formatAuditDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">
                      {log.hotel_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                      {log.actor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {log.resource_type}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && logs.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-900">1–{logs.length}</span> of <span className="font-medium text-gray-900">{logs.length}</span> entries
            </span>
            <div className="flex gap-1">
              <button className="px-2.5 py-1 text-gray-500 border border-transparent rounded hover:bg-gray-100">&lt;</button>
              <button className="px-3 py-1 bg-orange-500 text-white font-medium rounded shadow-sm">1</button>
              <button className="px-2.5 py-1 text-gray-500 border border-transparent rounded hover:bg-gray-100">&gt;</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
