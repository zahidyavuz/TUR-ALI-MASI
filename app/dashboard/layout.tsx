'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-container min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {children}
    </div>
  );
}
