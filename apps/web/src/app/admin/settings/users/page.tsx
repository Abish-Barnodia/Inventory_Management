'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  department_name: string | null;
  department_id: number | null;
  is_active: boolean;
  last_login: string | null;
};

export default function UsersAndRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<{id: number, name: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/users');
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/departments');
      if (response.data) {
        setDepartments(response.data.filter((d: any) => d.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch departments');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  const openNewModal = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('');
    setDepartmentId('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditMode(true);
    setCurrentId(user.id);
    setName(user.name);
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setRole(user.role);
    setDepartmentId(user.department_id || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim() || !role) {
      toast.error('Name, email, and role are required');
      return;
    }

    if ((role === 'Dept Manager' || role === 'Staff') && !departmentId) {
      toast.error('Department is required for this role');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        email,
        phone,
        role,
        department_id: departmentId === '' ? null : departmentId
      };

      if (isEditMode && currentId) {
        await apiClient.patch(`/users/${currentId}`, payload);
        toast.success('User updated successfully');
      } else {
        await apiClient.post('/users', payload);
        toast.success('User created successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    const newStatus = !user.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${actionWord} ${user.name}?`)) {
      try {
        await apiClient.post(`/users/${user.id}/deactivate`, { is_active: newStatus });
        toast.success(`User ${actionWord}d successfully`);
        fetchUsers();
      } catch (error: any) {
        toast.error(`Failed to ${actionWord} user`);
      }
    }
  };

  const handleResetPassword = async (user: User) => {
    if (confirm(`Are you sure you want to send a password reset email to ${user.email}?`)) {
      try {
        const res = await apiClient.post(`/users/${user.id}/reset-password`);
        toast.success(res.data.message || 'Password reset email sent');
      } catch (error) {
        toast.error('Failed to reset password');
      }
    }
  };

  const getRoleColor = (roleStr: string) => {
    switch(roleStr) {
      case 'Hotel Admin': return 'bg-orange-100 text-orange-700';
      case 'Store Manager': return 'bg-blue-100 text-blue-700';
      case 'Dept Manager': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatLastLogin = (dateString: string | null) => {
    if (!dateString) return 'Never';
    // Dummy logic for relative time
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return 'Just now';
    if (hours < 24) return `${hours} hrs ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(search.toLowerCase()) || (user.email && user.email.toLowerCase().includes(search.toLowerCase()));
    const matchRole = roleFilter ? user.role === roleFilter : true;
    const matchDept = deptFilter ? user.department_id?.toString() === deptFilter : true;
    const matchStatus = statusFilter === 'Active' ? user.is_active : statusFilter === 'Inactive' ? !user.is_active : true;
    return matchSearch && matchRole && matchDept && matchStatus;
  });

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users & Roles</h1>
            <p className="text-sm text-gray-500 mt-1">Manage staff accounts and access levels</p>
          </div>
          <Button 
            onClick={openNewModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            + Add User
          </Button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search name or email..." 
              className="pl-9 bg-white border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Roles</option>
            <option value="Hotel Admin">Hotel Admin</option>
            <option value="Store Manager">Store Manager</option>
            <option value="Dept Manager">Dept Manager</option>
            <option value="Staff">Staff</option>
          </select>

          <select 
            value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select 
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-[140px] items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <Card className="shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b font-semibold">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">NAME</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">EMAIL</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">ROLE</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">DEPARTMENT</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">STATUS</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">LAST LOGIN</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-gray-500">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap", getRoleColor(user.role))}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.department_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap",
                          user.is_active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-500"
                        )}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatLastLogin(user.last_login)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-orange-500 text-xs font-medium whitespace-nowrap">
                          <button onClick={() => openEditModal(user)} className="hover:text-orange-600 transition-colors">
                            Edit
                          </button>
                          <span className="text-gray-300">·</span>
                          <button 
                            onClick={() => handleToggleActive(user)} 
                            className={cn(
                              "transition-colors",
                              user.is_active ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"
                            )}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <span className="text-gray-300">·</span>
                          <button onClick={() => handleResetPassword(user)} className="hover:text-orange-600 transition-colors">
                            Reset Pwd
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Raju Kumar"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled={isEditMode}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="raju@grandview.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (e.target.value === 'Store Manager' || e.target.value === 'Hotel Admin') {
                    setDepartmentId('');
                  }
                }}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="" disabled>Select Role</option>
                <option value="Hotel Admin">Hotel Admin</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Dept Manager">Dept Manager</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            {(role === 'Dept Manager' || role === 'Staff') && (
              <div className="space-y-2">
                <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                <select
                  id="department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
