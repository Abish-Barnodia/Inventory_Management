'use client';

import { useState, useEffect } from 'react';
import { superAdminApi } from '@/lib/api';
import { KeyRound, Loader2 } from 'lucide-react';

export default function MyAccountPage() {
  const [account, setAccount] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await superAdminApi.getAccount();
        if (response.success) {
          setAccount(response.data);
        }
      } catch (err) {
        console.error('Failed to load account', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccount();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    
    // Check for uppercase, number, special char
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter, one number, and one special character');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await superAdminApi.updatePassword({ currentPassword, newPassword });
      if (response.success) {
        setSuccessMsg('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(response.message || 'Failed to update password');
      }
    } catch (err) {
      setError('An error occurred while updating the password');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">My Account</h2>
        <p className="text-gray-500 mt-1">Manage your super admin credentials</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
        {/* Profile Header */}
        <div className="flex items-center gap-5 mb-10 pb-8 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold">
            SA
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{account?.name || 'Admin User'}</h3>
            <p className="text-sm text-gray-500 mb-2">{account?.email || 'admin@blizzbooks.io'}</p>
            <span className="inline-flex items-center justify-center px-3 py-1 bg-orange-50 text-orange-600 text-xs font-semibold rounded-full border border-orange-100">
              Superadmin
            </span>
          </div>
        </div>

        {/* Change Password Form */}
        <div>
          <h4 className="text-base font-bold text-gray-900 mb-6">Change Password</h4>
          
          <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}
            
            {successMsg && (
              <div className="p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                placeholder="Min 12 chars, 1 upper, 1 number, 1 special"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
              <p className="mt-1.5 text-xs text-gray-400">
                Minimum 12 characters with at least one uppercase, number, and special character
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isUpdating || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors w-44"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
