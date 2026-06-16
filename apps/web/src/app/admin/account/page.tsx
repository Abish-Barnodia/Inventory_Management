'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Mail, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { mockDb } from '@/lib/mock-api';

export default function MyAccountPage() {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@grandview.com',
    phone: '+91 98765 43210'
  });
  
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || 'Admin User',
        email: user.email || 'admin@grandview.com',
        phone: user.phone || '+91 98765 43210'
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    toast.loading('Saving changes...', { id: 'save-account' });
    try {
      await mockDb.updateProfile(user.id, profile.name, profile.phone);
      
      // Update local storage so UI doesn't revert on refresh
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.name = profile.name;
        parsed.phone = profile.phone;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
      
      toast.success('Profile updated successfully', { id: 'save-account' });
    } catch (error) {
      toast.error('Failed to update profile', { id: 'save-account' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user?.id) return;
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    toast.loading('Updating password...', { id: 'pwd' });
    try {
      await mockDb.updatePassword(user.id, passwords.current, passwords.new);
      toast.success('Password updated successfully', { id: 'pwd' });
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password', { id: 'pwd' });
    }
  };

  return (
    <RoleGuard allowedRoles={['superadmin', 'admin', 'manager', 'staff']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Account</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your personal profile and security settings</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Col: Personal Info */}
            <div className="md:col-span-2 space-y-6">
              <Card className="shadow-sm border border-gray-200">
                <CardHeader className="pb-4 border-b bg-gray-50/50">
                  <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-500 font-normal text-sm">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="pl-9 bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-gray-400">Email cannot be changed.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-500 font-normal text-sm">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                    >
                      {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Section */}
              <Card className="shadow-sm border border-gray-200">
                <CardHeader className="pb-4 border-b bg-gray-50/50">
                  <CardTitle className="text-base font-semibold">Change Password</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="current-pwd">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="current-pwd"
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="new-pwd">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="new-pwd"
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-pwd">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="confirm-pwd"
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      variant="outline"
                      onClick={handleUpdatePassword} 
                      className="border-orange-200 text-orange-600 hover:bg-orange-50 font-semibold"
                    >
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Col: Account Status */}
            <div className="space-y-6">
              <Card className="shadow-sm border border-gray-200">
                <CardHeader className="pb-4 border-b bg-gray-50/50">
                  <CardTitle className="text-base font-semibold">Account Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white shadow-sm">
                      <span className="text-2xl font-bold text-orange-600">
                        {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{user?.role || 'Admin'} Role</p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full tracking-wider">
                      Active Account
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
