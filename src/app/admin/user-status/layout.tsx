"use client";

import React from 'react';
import { useAuth } from '@/components/Auth/AuthContext';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/UI';

export default function UserStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  // Check if user is authenticated and is an admin
  React.useEffect(() => {
    if (!isLoading && (!user || !profile?.is_admin)) {
      router.push('/');
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loading type="fullscreen" text="Loading..." />
      </div>
    );
  }

  if (!user || !profile?.is_admin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
} 