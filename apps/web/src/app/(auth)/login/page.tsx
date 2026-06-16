'use client';

import React from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth(); // Wait, user is populated after login success, but might not be available immediately in this scope if it's state based.
  
  // A better way is to check the user object directly from localStorage since it was just set, 
  // or pass the user object in the onSuccess callback.
  // Let's modify onSuccess to accept the user object.
  const handleLoginSuccess = (user?: any) => {
    if (user?.role === 'superadmin') {
      router.push('/super_admin');
    } else {
      router.push('/admin/dashboard');
    }
  };

  return <LoginForm onSuccess={handleLoginSuccess} />;
}
