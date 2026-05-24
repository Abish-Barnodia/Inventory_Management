'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

type Department = {
  id: number;
  name: string;
  description: string | null;
  staff_count: number;
  open_requests: number;
  is_active: boolean;
};

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/departments');
      if (response.data) {
        setDepartments(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const openNewModal = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setIsEditMode(true);
    setCurrentId(dept.id);
    setName(dept.name);
    setDescription(dept.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Department name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isEditMode && currentId) {
        await apiClient.patch(`/departments/${currentId}`, { name, description });
        toast.success('Department updated successfully');
      } else {
        await apiClient.post('/departments', { name, description });
        toast.success('Department created successfully');
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    const newStatus = !dept.is_active;
    const actionWord = newStatus ? 'activate' : 'deactivate';
    
    if (confirm(`Are you sure you want to ${actionWord} this department?`)) {
      try {
        await apiClient.patch(`/departments/${dept.id}`, { is_active: newStatus });
        toast.success(`Department ${actionWord}d successfully`);
        fetchDepartments();
      } catch (error: any) {
        if (error?.response?.status === 409) {
          toast.error(`Cannot deactivate: Department has ${error.response.data.count} open requests.`);
        } else {
          toast.error(`Failed to ${actionWord} department`);
        }
      }
    }
  };

  return (
    <>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Departments</h1>
            <p className="text-sm text-gray-500 mt-1">Manage hotel departments</p>
          </div>
          <Button 
            onClick={openNewModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            + New Department
          </Button>
        </div>

        <Card className="shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50/50 border-b font-semibold">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">NAME</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">DESCRIPTION</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">STAFF COUNT</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">OPEN REQUESTS</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">STATUS</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Loading departments...
                    </td>
                  </tr>
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No departments found. Click "+ New Department" to add one.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{dept.name}</td>
                      <td className="px-6 py-4 text-gray-500">{dept.description || '—'}</td>
                      <td className="px-6 py-4">{dept.staff_count}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold",
                          dept.open_requests > 0 
                            ? "bg-amber-100 text-amber-700" 
                            : "bg-emerald-100 text-emerald-700"
                        )}>
                          {dept.open_requests}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-medium",
                          dept.is_active 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-orange-500 text-sm font-medium">
                          <button onClick={() => openEditModal(dept)} className="hover:text-orange-600 transition-colors">
                            Edit
                          </button>
                          <span className="text-gray-300">·</span>
                          <button 
                            onClick={() => handleToggleActive(dept)} 
                            className={cn(
                              "transition-colors",
                              dept.is_active ? "text-red-500 hover:text-red-600" : "text-green-600 hover:text-green-700"
                            )}
                          >
                            {dept.is_active ? 'Deactivate' : 'Activate'}
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
            <DialogTitle>{isEditMode ? 'Edit Department' : 'Create New Department'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Kitchen"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-500">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the department's function"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white">
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Department')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>

  );
}
