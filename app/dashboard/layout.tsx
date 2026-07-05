'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <span className="text-slate-400 font-semibold">Yükleniyor...</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dashboard-container min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {children}
    </div>
  );
}
