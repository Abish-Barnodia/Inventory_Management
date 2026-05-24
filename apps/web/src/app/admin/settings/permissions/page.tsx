'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Lock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';

type Permission = {
  key: string;
  title: string;
  description: string;
  is_enabled: boolean;
  is_locked: boolean;
};

const ROLES = ['Store Manager', 'Dept Manager', 'Staff'];

export default function RolePermissionsPage() {
  const [activeTab, setActiveTab] = useState<string>('Store Manager');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = async (role: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/permissions?role=${role}`);
      if (response.data) {
        setPermissions(response.data);
      }
    } catch (error) {
      toast.error('Failed to fetch permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions(activeTab);
  }, [activeTab]);

  const handleToggle = async (perm: Permission) => {
    if (perm.is_locked) return;

    const newEnabledState = !perm.is_enabled;
    
    // Optimistic update
    setPermissions(prev => prev.map(p => p.key === perm.key ? { ...p, is_enabled: newEnabledState } : p));

    try {
      await apiClient.patch('/permissions', {
        role: activeTab,
        permission_key: perm.key,
        is_enabled: newEnabledState
      });
      toast.success('Permission updated');
    } catch (error) {
      toast.error('Failed to update permission');
      // Revert optimistic update
      setPermissions(prev => prev.map(p => p.key === perm.key ? { ...p, is_enabled: !newEnabledState } : p));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Role Permissions</h1>
            <p className="text-sm text-gray-500 mt-1">Configure feature flags per role</p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 border-b border-gray-200">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setActiveTab(role)}
                className={cn(
                  "pb-3 text-sm font-medium transition-colors relative",
                  activeTab === role 
                    ? "text-orange-500" 
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {role}
                {activeTab === role && (
                  <div className="absolute bottom-[-1px] left-0 w-full h-0.5 bg-orange-500" />
                )}
              </button>
            ))}
          </div>

          {/* Banner */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-blue-700 font-medium">
              Permission changes take effect on the user's next login.
            </p>
          </div>

          {/* Permissions List */}
          <Card className="shadow-sm border border-gray-200">
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Loading permissions...</div>
              ) : permissions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No permissions found.</div>
              ) : (
                permissions.map((perm) => (
                  <div key={perm.key} className="p-6 flex items-start justify-between bg-white hover:bg-gray-50/50 transition-colors">
                    <div className="pr-4 space-y-1 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{perm.title}</span>
                        {perm.is_locked && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wider">
                            <Lock className="w-3 h-3 text-orange-400" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{perm.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "text-xs font-bold uppercase",
                        !perm.is_enabled && !perm.is_locked ? "text-gray-400" : "text-gray-300"
                      )}>
                        OFF
                      </span>
                      <Switch 
                        checked={perm.is_enabled} 
                        disabled={perm.is_locked}
                        onCheckedChange={() => handleToggle(perm)}
                        className={cn(
                          perm.is_enabled && !perm.is_locked ? "!bg-orange-500" : "",
                          perm.is_locked && "opacity-50"
                        )}
                      />
                      {/* For locked items, don't show the ON label at all if that matches screenshot. 
                          Or show it faded. The screenshot shows it completely missing or invisible for the locked item. */}
                      {!perm.is_locked && (
                        <span className={cn(
                          "text-xs font-bold uppercase",
                          perm.is_enabled ? "text-orange-500" : "text-gray-300"
                        )}>
                          ON
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          
        </div>
  );
}
