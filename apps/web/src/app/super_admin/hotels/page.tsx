'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { superAdminApi } from '@/lib/api';
import {
  Search, MoreVertical, ChevronLeft, ChevronRight,
  Loader2, X, Building2, CheckCircle, PauseCircle, XCircle, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
interface Hotel {
  id: number;
  name: string;
  owner_name: string;
  phone: string;
  subscription_plan: string;
  status: 'active' | 'suspended' | 'deactivated';
  subscription_expires_at: string | null;
  created_at: string;
  user_count: number;
  owner_email?: string;
  address?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free_trial: 'Free Trial', basic: 'Basic', premium: 'Premium', enterprise: 'Enterprise',
};
const PLAN_COLORS: Record<string, string> = {
  free_trial: 'text-gray-500',
  basic: 'bg-blue-50 text-blue-700 border-blue-200',
  premium: 'bg-green-50 text-green-700 border-green-200',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
};
const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500', suspended: 'bg-amber-500', deactivated: 'bg-red-500',
};
const STATUS_TEXT: Record<string, string> = {
  active: 'text-green-700', suspended: 'text-amber-700', deactivated: 'text-red-600',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function isExpired(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}
function isExpiringSoon(d: string | null) {
  if (!d) return false;
  const days = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

// ── Create Hotel Modal ────────────────────────────────────────────────────────
interface CreateHotelModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PLANS = ['free_trial', 'basic', 'premium', 'enterprise'];

function CreateHotelModal({ open, onClose, onCreated }: CreateHotelModalProps) {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', owner_name: '',
    owner_email: '', owner_password: '', subscription_plan: 'basic', subscription_expires_at: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await superAdminApi.createHotel({
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        owner_password: form.owner_password,
        subscription_plan: form.subscription_plan,
        subscription_expires_at: form.subscription_expires_at,
      });
      setForm({ name: '', address: '', phone: '', owner_name: '', owner_email: '', owner_password: '', subscription_plan: 'basic', subscription_expires_at: '' });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create hotel. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create Hotel</h2>
              <p className="text-xs text-gray-500">Add a new hotel to the platform</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Hotel Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Hotel Name *</label>
            <input name="name" value={form.name} onChange={handleChange} required
              placeholder="e.g. Sunrise Inn"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400" />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Address</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows={2}
              placeholder="Full address (optional)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400 resize-none" />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Phone</label>
            <input name="phone" value={form.phone} onChange={handleChange}
              placeholder="+91 98765 43210 (optional)"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400" />
          </div>

          {/* Owner Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Owner Name *</label>
            <input name="owner_name" value={form.owner_name} onChange={handleChange} required
              placeholder="e.g. Ravi Sharma"
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400" />
          </div>

          {/* Owner Email & Password side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Owner Email *</label>
              <input name="owner_email" value={form.owner_email} onChange={handleChange} required type="email"
                placeholder="admin@hotel.com"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Owner Password *</label>
              <input name="owner_password" value={form.owner_password} onChange={handleChange} required type="text"
                placeholder="Initial password"
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 placeholder:text-gray-400" />
            </div>
          </div>

          {/* Plan + Expiry side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Plan *</label>
              <select name="subscription_plan" value={form.subscription_plan} onChange={handleChange} required
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white">
                {PLANS.map(p => (
                  <option key={p} value={p}>{PLAN_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Expires At *</label>
              <input name="subscription_expires_at" value={form.subscription_expires_at} onChange={handleChange}
                required type="date" min={minDateStr}
                className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={isLoading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating…</> : 'Create Hotel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── View Hotel Modal ──────────────────────────────────────────────────────────
function ViewHotelModal({ hotel, open, onClose }: { hotel: Hotel | null, open: boolean, onClose: () => void }) {
  if (!open || !hotel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{hotel.name} Details</h2>
              <p className="text-xs text-gray-500">Complete property information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Hotel ID</label>
              <div className="text-sm font-mono text-gray-900">{hotel.id}</div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Status</label>
              <div className="text-sm font-medium text-gray-900 capitalize">{hotel.status}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Address</label>
            <div className="text-sm text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-100 min-h-[2.5rem]">
              {hotel.address || 'N/A'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Phone</label>
            <div className="text-sm text-gray-900">{hotel.phone || 'N/A'}</div>
          </div>

          <hr className="border-gray-100" />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Owner Name</label>
              <div className="text-sm text-gray-900">{hotel.owner_name}</div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Owner Email</label>
              <div className="text-sm text-gray-900">{hotel.owner_email || 'N/A'}</div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Plan</label>
              <div className="text-sm text-gray-900 capitalize">{hotel.subscription_plan || 'N/A'}</div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Expires At</label>
              <div className="text-sm text-gray-900">
                {hotel.subscription_expires_at ? new Date(hotel.subscription_expires_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
          
          <div className="pt-2 flex justify-end">
            <Button onClick={onClose} variant="outline" className="px-6">Close</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Actions Menu ──────────────────────────────────────────────────────────────
function ActionsMenu({ hotel, onStatusChange, onViewDetails }: { hotel: Hotel; onStatusChange: () => void; onViewDetails: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStatus = async (status: string) => {
    setLoading(true);
    setOpen(false);
    try {
      await superAdminApi.updateHotelStatus(String(hotel.id), status);
      onStatusChange();
    } catch (e) {
      console.error('Status update failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-44 text-sm">
            <button onClick={() => { setOpen(false); onViewDetails(); }}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-blue-600">
              <Eye className="w-4 h-4" /> View Details
            </button>
            {hotel.status !== 'active' && (
              <button onClick={() => handleStatus('active')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-green-700">
                <CheckCircle className="w-4 h-4" /> Reactivate
              </button>
            )}
            {hotel.status === 'active' && (
              <button onClick={() => handleStatus('suspended')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 w-full text-amber-700">
                <PauseCircle className="w-4 h-4" /> Suspend
              </button>
            )}
            {hotel.status !== 'deactivated' && (
              <button onClick={() => handleStatus('deactivated')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 w-full text-red-600">
                <XCircle className="w-4 h-4" /> Deactivate
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingHotel, setViewingHotel] = useState<Hotel | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [expiringFilter, setExpiringFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const fetchHotels = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(limit), sort: sortBy };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (planFilter) params.plan = planFilter;
      if (expiringFilter) params.expiring = expiringFilter;
      const res = await superAdminApi.getHotels(params);
      setHotels(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error('Failed to fetch hotels', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, planFilter, expiringFilter, sortBy]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);

  // Reset to page 1 when filters change
  const handleFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v); setPage(1);
  };

  return (
    <>
      <CreateHotelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchHotels}
      />
      <ViewHotelModal
        hotel={viewingHotel}
        open={!!viewingHotel}
        onClose={() => setViewingHotel(null)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hotels</h1>
            <p className="text-gray-500 text-sm mt-1">Manage all registered hotel properties</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm w-full sm:w-auto"
          >
            + Create Hotel
          </Button>
        </div>

        <Card className="shadow-sm border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by hotel name, owner or phone…"
                className="w-full h-9 rounded-lg border border-gray-200 pl-9 pr-4 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white"
              />
            </div>

            {/* Status */}
            <select value={statusFilter} onChange={e => handleFilter(setStatusFilter)(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 pr-8 text-sm focus:outline-none focus:border-orange-400 bg-white text-gray-700">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>

            {/* Plan */}
            <select value={planFilter} onChange={e => handleFilter(setPlanFilter)(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 pr-8 text-sm focus:outline-none focus:border-orange-400 bg-white text-gray-700">
              <option value="">All Plans</option>
              <option value="free_trial">Free Trial</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Expiry */}
            <select value={expiringFilter} onChange={e => handleFilter(setExpiringFilter)(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 px-3 pr-8 text-sm focus:outline-none focus:border-orange-400 bg-white text-gray-700">
              <option value="">All Expiry</option>
              <option value="7days">Within 7 Days</option>
              <option value="30days">Within 30 Days</option>
              <option value="expired">Expired</option>
            </select>

            {/* Sort */}
            <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-gray-200 px-3 pr-8 text-sm focus:outline-none focus:border-orange-400 bg-white text-gray-700">
              <option value="created_at">Created Date ↓</option>
              <option value="name">Name</option>
              <option value="expiry">Expiry Date</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F8F9FA] text-gray-400 font-semibold text-xs tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 uppercase">Hotel Name</th>
                  <th className="px-5 py-3 uppercase">Owner</th>
                  <th className="px-5 py-3 uppercase">Plan</th>
                  <th className="px-5 py-3 uppercase">Status</th>
                  <th className="px-5 py-3 uppercase">Expiry</th>
                  <th className="px-5 py-3 uppercase text-center">Users</th>
                  <th className="px-5 py-3 uppercase">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-gray-100 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : hotels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No hotels found.</p>
                      <p className="text-gray-400 text-xs mt-1">Create your first hotel to get started.</p>
                    </td>
                  </tr>
                ) : hotels.map(hotel => (
                  <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-gray-900">{hotel.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{hotel.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{hotel.owner_name}</td>
                    <td className="px-5 py-4">
                      {hotel.subscription_plan === 'free_trial' ? (
                        <span className="text-gray-500 text-xs font-medium">Free Trial</span>
                      ) : (
                        <Badge className={cn('shadow-none border rounded text-xs font-semibold', PLAN_COLORS[hotel.subscription_plan])}>
                          {PLAN_LABELS[hotel.subscription_plan]}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', STATUS_DOT[hotel.status])} />
                        <span className={cn('font-medium capitalize text-xs', STATUS_TEXT[hotel.status])}>
                          {hotel.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('font-medium text-xs',
                        isExpired(hotel.subscription_expires_at) ? 'text-red-500' :
                        isExpiringSoon(hotel.subscription_expires_at) ? 'text-amber-600' :
                        'text-gray-600'
                      )}>
                        {formatDate(hotel.subscription_expires_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-gray-700 font-medium">{hotel.user_count ?? 0}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{formatDate(hotel.created_at)}</td>
                    <td className="px-5 py-4">
                      <ActionsMenu hotel={hotel} onStatusChange={fetchHotels} onViewDetails={() => setViewingHotel(hotel)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!isLoading && total > 0 && (
            <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} hotels</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-semibold transition-colors',
                        page === pageNum ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-600'
                      )}>
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-1">…</span>}
                {totalPages > 5 && (
                  <button onClick={() => setPage(totalPages)}
                    className={cn('w-8 h-8 rounded-lg text-sm font-semibold transition-colors',
                      page === totalPages ? 'bg-orange-500 text-white' : 'hover:bg-gray-100 text-gray-600')}>
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
