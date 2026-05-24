'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

type HotelProfile = {
  name: string;
  address: string;
  phone: string;
  timezone: string;
  currency: string;
  logo_url: string;
};

export default function HotelProfilePage() {
  const [profile, setProfile] = useState<HotelProfile>({
    name: '',
    address: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR — Indian Rupee',
    logo_url: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/hotels/profile');
        if (response.data) {
          setProfile(response.data);
        }
      } catch (error) {
        toast.error('Failed to load hotel profile.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    toast.loading('Saving changes...', { id: 'save-profile' });
    try {
      const response = await apiClient.patch('/hotels/profile', profile);
      if (response.data) {
        setProfile(response.data);
      }
      toast.success('Hotel profile updated successfully.', { id: 'save-profile' });
    } catch (error) {
      toast.error('Failed to update hotel profile.', { id: 'save-profile' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = () => {
    // Simulated upload click
    document.getElementById('logo-upload')?.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hotel Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your property details</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || isLoading} 
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
              <CardTitle className="text-base font-semibold">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="hotel_name">Hotel Name <span className="text-red-500">*</span></Label>
                <Input
                  id="hotel_name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="e.g. Grand View Hotel"
                  className="border-orange-200 focus-visible:ring-orange-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-500 font-normal text-sm">Address</Label>
                <Textarea
                  id="address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-500 font-normal text-sm">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-gray-500 font-normal text-sm">Timezone <span className="text-red-500">*</span></Label>
                  <select
                    id="timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency" className="text-gray-500 font-normal text-sm">Currency <span className="text-red-500">*</span></Label>
                <select
                  id="currency"
                  value={profile.currency}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                  className="flex h-10 w-1/2 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="INR — Indian Rupee">INR — Indian Rupee</option>
                  <option value="USD — US Dollar">USD — US Dollar</option>
                  <option value="EUR — Euro">EUR — Euro</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Logo Upload */}
        <div className="space-y-6">
          <Card className="shadow-sm border border-gray-200">
            <CardHeader className="pb-4 border-b bg-gray-50/50">
              <CardTitle className="text-base font-semibold">Hotel Logo</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                {profile.logo_url ? (
                  <div className="relative group">
                    <img src={profile.logo_url} alt="Hotel Logo" className="h-24 w-auto object-contain rounded-md" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                      <Button variant="ghost" size="sm" className="text-white hover:text-red-400" onClick={() => setProfile({...profile, logo_url: ''})}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-lg flex items-center justify-center mb-2">
                      <Building2 className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Drop logo here</p>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP · Max 2MB</p>
                    </div>
                    <input type="file" id="logo-upload" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const url = URL.createObjectURL(e.target.files[0]);
                          setProfile({...profile, logo_url: url});
                        }
                    }} />
                    <Button variant="outline" size="sm" className="mt-2 bg-white text-gray-700" onClick={handleLogoUpload}>
                      Browse File
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
