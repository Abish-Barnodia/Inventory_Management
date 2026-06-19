'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Info, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = ['Store Manager', 'Dept Manager', 'Staff'];

export default function RolePermissionsPage() {
  const [activeTab, setActiveTab] = useState<string>('Store Manager');

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

      {/* Coming Soon */}
      <Card className="shadow-sm border border-gray-200 flex flex-col items-center justify-center py-20 px-4 text-center">
        <Lock className="w-12 h-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Coming Soon</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Granular role permission configuration is currently under development and will be available in a future update.
        </p>
      </Card>
      
    </div>
  );
}
